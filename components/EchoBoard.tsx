"use client";

import { useEffect, useRef, useState } from "react";
import { RetroButton } from "./RetroButton";
import { RetroWindow } from "./RetroWindow";
import type { PublicComment } from '@/lib/cms';
import styles from "./EchoBoard.module.css";

type LocalComment = PublicComment;
type SendPhase = "idle" | "sending" | "done" | "error";
type DisplayComment = { comment: LocalComment; depth: number };

function orderCommentThread(comments: LocalComment[]): DisplayComment[] {
  const nodes = new Map(comments.map((comment) => [comment.id, { comment, children: [] as LocalComment[] }]));
  const roots: LocalComment[] = [];

  for (const comment of comments) {
    const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
    if (parent && parent.comment.id !== comment.id) parent.children.push(comment);
    else roots.push(comment);
  }

  const result: DisplayComment[] = [];
  const visited = new Set<string>();
  const visit = (comment: LocalComment, depth: number) => {
    if (visited.has(comment.id)) return;
    visited.add(comment.id);
    result.push({ comment, depth });
    for (const child of nodes.get(comment.id)?.children || []) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  for (const comment of comments) visit(comment, 0);
  return result;
}

/**
 * Persistent comment board with optional identity fields, moderated replies,
 * and a terminal-style send animation. Reduced motion prints the script at once.
 */
export function EchoBoard({ issue, slug, comments: initialComments }: { issue: string; slug: string; comments: PublicComment[] }) {
  const [comments, setComments] = useState<LocalComment[]>(initialComments);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");
  const [replyTo, setReplyTo] = useState<LocalComment | null>(null);
  const [trap, setTrap] = useState("");
  const [result, setResult] = useState("");
  const [phase, setPhase] = useState<SendPhase>("idle");
  const [typed, setTyped] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stash = timers.current;
    return () => stash.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  // Layer stack sticky offsets depend on this window's height.
  const remeasure = () => window.dispatchEvent(new Event("resize"));

  const handleFocus = () => {
    if (expanded) return;
    setExpanded(true);
    later(remeasure, 400);
  };

  const finish = async (ok: boolean) => {
    if (!ok) {
      setResult("// ERR 400 · NICK 与正文为必填项");
      setPhase("error");
    } else {
      try {
        const response = await fetch('/api/echo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, author: nick.trim(), text: draft.trim(), email: email.trim(), site: site.trim(), parentId: replyTo?.id, trap }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '发送失败');
        if (data.status === 'approved' && data.comment) {
          setComments((prev) => [...prev, data.comment]);
          setResult('// ECHO_PUBLISHED · 评论已公开');
        } else {
          setResult('// ECHO_QUEUED · 已提交，等待审核');
        }
        setDraft('');
        setReplyTo(null);
        later(remeasure, 80);
        setPhase('done');
      } catch (error) {
        setResult(`// ERR · ${error instanceof Error ? error.message : '发送失败'}`);
        setPhase('error');
      }
    }
    later(() => {
      setPhase("idle");
      setTyped([]);
      setCurrent("");
      setResult("");
    }, 2600);
  };

  const handleSend = () => {
    if (phase === "sending") return;
    const missing = !nick.trim() || !draft.trim();
    const script = missing
      ? [`auth --guest --nick="${nick.trim() || "?"}"`, "verify --fields=nick,body"]
      : [
          `auth --guest --nick="${nick.trim()}"${site.trim() ? ` --site=${site.trim()}` : ""}`,
          `sign payload --bytes=${new Blob([draft]).size}`,
          `transmit --to=ECHO_BOARD --slot=${String(comments.length + 1).padStart(2, "0")}`,
        ];
    setPhase("sending");
    setTyped([]);
    setCurrent("");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(script);
      later(() => finish(!missing), 300);
      return;
    }

    let lineIndex = 0;
    let charIndex = 0;
    const step = () => {
      if (lineIndex >= script.length) {
        setCurrent("");
        later(() => finish(!missing), 420);
        return;
      }
      const line = script[lineIndex];
      charIndex++;
      setCurrent(line.slice(0, charIndex));
      if (charIndex < line.length) {
        later(step, 8 + Math.random() * 10);
      } else {
        later(() => {
          setTyped((prev) => [...prev, line]);
          setCurrent("");
          lineIndex++;
          charIndex = 0;
          later(step, 90);
        }, 50);
      }
    };
    later(step, 200);
  };

  const handleReply = (comment: LocalComment) => {
    if (phase === 'sending') return;
    setReplyTo(comment);
    setExpanded(true);
    requestAnimationFrame(() => {
      composeRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      textareaRef.current?.focus({ preventScroll: true });
      remeasure();
    });
  };

  const sending = phase === "sending";
  const displayedComments = orderCommentThread(comments);

  return (
    <RetroWindow title="ECHO_BOARD.EXE" eyebrow={`回声留言板 // ${comments.length} MESSAGES`} className={styles.echoWindow}>
      <ol className={styles.echoList}>
        {displayedComments.map(({ comment, depth }) => (
          <li key={comment.id} className={`${styles.echoItem} ${styles[`depth${Math.min(depth, 3)}`]}`}>
            <p className={styles.echoHead}>
              <span>&gt;</span>{' '}
              {comment.site ? (
                <a className={styles.authorLink} href={comment.site} target="_blank" rel="noopener noreferrer">{comment.author}</a>
              ) : comment.author}
              {' '}<em>:: {comment.postedAt}</em>
              <button className={styles.replyButton} type="button" onClick={() => handleReply(comment)} disabled={sending}>回复</button>
            </p>
            <p className={styles.echoText}>{comment.text}</p>
          </li>
        ))}
      </ol>

      <div className={styles.compose} ref={composeRef}>
        <p className={styles.composeLine}>&gt; compose --reply --post=POST_{issue}.LOG{replyTo ? ` --parent=${replyTo.id}` : ''}</p>
        {replyTo && (
          <div className={styles.replyTarget}>
            <span>REPLY_TO :: @{replyTo.author}</span>
            <button type="button" onClick={() => setReplyTo(null)} disabled={sending}>取消回复</button>
          </div>
        )}
        <div className={styles.termBox}>
          <span className={styles.prompt} aria-hidden="true">{nick.trim() ? `${nick.trim()}>` : ">"}</span>
          <div className={styles.inputWrap}>
            <div className={styles.mirror} ref={mirrorRef} aria-hidden="true">
              {draft === "" ? <span className={styles.mirrorPlaceholder}>写下你的回声…</span> : draft}
              <span className={styles.fakeCursor}>_</span>
            </div>
            <textarea
              ref={textareaRef}
              className={styles.ghostInput}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={handleFocus}
              onScroll={(event) => {
                if (mirrorRef.current) mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
              }}
              rows={3}
              disabled={sending}
              aria-label="评论内容"
              maxLength={2000}
            />
          </div>
        </div>
        <label style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">请勿填写<input tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} /></label>
        <div className={styles.identity} data-open={expanded || undefined}>
          <div className={styles.identityInner}>
            <div className={styles.fields}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>&gt; nick:</span>
                <input className={styles.fieldInput} value={nick} onChange={(event) => setNick(event.target.value)} placeholder="昵称（必填）" disabled={sending} maxLength={24} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>&gt; mail:</span>
                <input className={styles.fieldInput} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="邮箱（可选，不会公开）" disabled={sending} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>&gt; site:</span>
                <input className={styles.fieldInput} type="url" value={site} onChange={(event) => setSite(event.target.value)} placeholder="个人网址（可选）" disabled={sending} />
              </label>
            </div>
          </div>
        </div>

        {phase !== "idle" && (
          <div className={styles.sendTerm} aria-live="polite">
            {typed.map((line) => (
              <p key={line} className={styles.termLine}><span className={styles.gt}>&gt;</span> {line}</p>
            ))}
            {sending && <p className={styles.termLine}><span className={styles.gt}>&gt;</span> {current}<span className={styles.cursor}>_</span></p>}
            {phase === "done" && <p className={styles.termResult}>{result}<span className={styles.cursor}>_</span></p>}
            {phase === "error" && <p className={styles.termError}>{result}<span className={styles.cursor}>_</span></p>}
          </div>
        )}

        <div className={styles.composeActions}>
          <RetroButton variant="signal" compact onClick={handleSend} disabled={sending}>{sending ? "发送中…" : "发送 ↗"}</RetroButton>
          <span className={styles.composeNote}>评论会保存；如站长开启审核，通过后才公开。</span>
        </div>
      </div>
    </RetroWindow>
  );
}

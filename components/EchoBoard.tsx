"use client";

import { useEffect, useRef, useState } from "react";
import { RetroButton } from "./RetroButton";
import { RetroWindow } from "./RetroWindow";
import type { DemoComment } from "@/lib/postDetails";
import styles from "./EchoBoard.module.css";

type LocalComment = DemoComment & { local?: boolean };
type SendPhase = "idle" | "sending" | "done" | "error";

/**
 * Interactive echo board. Focusing the compose box unfolds the identity fields
 * (nick / mail / site). Sending pops up a mini terminal that types a simulated
 * transmit script, then appends the echo to the local list — demo only, no
 * persistence. Reduced motion prints the script instantly.
 */
export function EchoBoard({ issue, comments: initialComments }: { issue: string; comments: DemoComment[] }) {
  const [comments, setComments] = useState<LocalComment[]>(initialComments);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");
  const [phase, setPhase] = useState<SendPhase>("idle");
  const [typed, setTyped] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mirrorRef = useRef<HTMLDivElement>(null);

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

  const finish = (ok: boolean) => {
    if (ok) {
      setComments((prev) => [...prev, { id: `local-${Date.now()}`, author: nick.trim(), postedAt: "刚刚 · LOCAL", text: draft.trim(), local: true }]);
      setDraft("");
      later(remeasure, 80);
    }
    setPhase(ok ? "done" : "error");
    later(() => {
      setPhase("idle");
      setTyped([]);
      setCurrent("");
    }, 2600);
  };

  const handleSend = () => {
    if (phase === "sending") return;
    const missing = !nick.trim() || !draft.trim();
    const script = missing
      ? [`auth --guest --nick="${nick.trim() || "?"}"`, "verify --fields=nick,body"]
      : [
          `auth --guest --nick="${nick.trim()}"${site.trim() ? ` --site=${site.trim()}` : ""}`,
          `sign payload --bytes=${new Blob([draft]).size} --algo=DEMO-MD5`,
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

  const sending = phase === "sending";

  return (
    <RetroWindow title="ECHO_BOARD.EXE" eyebrow={`回声留言板 // ${comments.length} MESSAGES · DEMO`} className={styles.echoWindow}>
      <ol className={styles.echoList}>
        {comments.map((comment) => (
          <li key={comment.id}>
            <p className={styles.echoHead}><span>&gt;</span> {comment.author} <em>:: {comment.postedAt}</em>{comment.local ? <b className={styles.localTag}>LOCAL</b> : null}</p>
            <p className={styles.echoText}>{comment.text}</p>
          </li>
        ))}
      </ol>

      <div className={styles.compose}>
        <span className={styles.demoTag}>DEMO</span>
        <p className={styles.composeLine}>&gt; compose --reply --post=POST_{issue}.LOG</p>
        <div className={styles.termBox}>
          <span className={styles.prompt} aria-hidden="true">{nick.trim() ? `${nick.trim()}>` : ">"}</span>
          <div className={styles.inputWrap}>
            <div className={styles.mirror} ref={mirrorRef} aria-hidden="true">
              {draft === "" ? <span className={styles.mirrorPlaceholder}>写下你的回声…（演示环境，评论仅追加在当前页面）</span> : draft}
              <span className={styles.fakeCursor}>_</span>
            </div>
            <textarea
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
            />
          </div>
        </div>
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
            {phase === "done" && <p className={styles.termResult}>{"// ECHO_QUEUED · 已追加到本地列表（演示，不持久化）"}<span className={styles.cursor}>_</span></p>}
            {phase === "error" && <p className={styles.termError}>{"// ERR 400 · NICK 与正文为必填项"}<span className={styles.cursor}>_</span></p>}
          </div>
        )}

        <div className={styles.composeActions}>
          <RetroButton variant="signal" compact onClick={handleSend} disabled={sending}>{sending ? "发送中…" : "发送 ↗"}</RetroButton>
          <span className={styles.composeNote}>本地演示：发送后追加到上方列表，刷新页面后消失。</span>
        </div>
      </div>
    </RetroWindow>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { posts } from "@/lib/posts";
import styles from "./PjaxProvider.module.css";

const OUTRO_LINE = "> render module [ OK ]";

function buildLines(href: string): string[] {
  const path = href.split("#")[0].split("?")[0] || "/";
  if (path === "/") return ["> GET /", "> mount HomeConsole [ OK ]"];
  if (path === "/components") return ["> GET /components", "> mount ShowcaseIndex [ OK ]"];
  if (path.startsWith("/posts/")) {
    const slug = path.slice("/posts/".length);
    const post = posts.find((p) => p.slug === slug);
    return [`> GET /posts/${slug}`, `> open POST_${post?.issue ?? "???"}.LOG [ OK ]`];
  }
  return [`> GET ${path}`];
}

/**
 * Site-wide PJAX navigation: intercepts internal link clicks, plays a short
 * terminal transition in a full-screen overlay, then completes the navigation
 * with router.push. History back/forward gets a shorter "restore" overlay.
 * All future pages automatically use this system — no per-page wiring needed.
 */
export function PjaxProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [typed, setTyped] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const pendingRef = useRef<{ href: string; origin: string } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const finish = () => {
    setLeaving(true);
    later(() => {
      clearTimers();
      setActive(false);
      setLeaving(false);
      setTyped([]);
      setCurrent("");
      document.body.style.overflow = "";
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }, 200);
  };

  const typeLines = (lines: string[], onDone: () => void) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(lines);
      setCurrent("");
      onDone();
      return;
    }
    let lineIndex = 0;
    let charIndex = 0;
    const step = () => {
      if (lineIndex >= lines.length) {
        setCurrent("");
        onDone();
        return;
      }
      const line = lines[lineIndex];
      charIndex++;
      setCurrent(line.slice(0, charIndex));
      if (charIndex < line.length) {
        later(step, 9 + Math.random() * 6);
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
    step();
  };

  const begin = (href: string) => {
    clearTimers();
    pendingRef.current = { href, origin: pathname };
    setTyped([]);
    setCurrent("");
    setLeaving(false);
    setActive(true);
    document.body.style.overflow = "hidden";
    typeLines(buildLines(href), () => {
      router.push(href);
      // Safety net: if the navigation never completes, hard-redirect.
      later(() => {
        if (pendingRef.current) window.location.assign(href);
      }, 5000);
    });
  };

  const beginRestore = (path: string) => {
    clearTimers();
    setTyped([]);
    setCurrent("");
    setLeaving(false);
    setActive(true);
    document.body.style.overflow = "hidden";
    typeLines(["> POP /history", `> restore ${path} [ OK ]`], () => {
      later(finish, 350);
    });
  };

  // Intercept internal link clicks before next/link handles them.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const raw = anchor.getAttribute("href");
      if (!raw) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (/^(mailto|tel|javascript):/i.test(raw)) return;
      const url = new URL(raw, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same-page anchor
      event.preventDefault();
      event.stopPropagation();
      if (active) return;
      begin(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  });

  // History back/forward: show a short restore overlay (no router.push).
  useEffect(() => {
    const onPopState = () => {
      if (pendingRef.current) return; // our own navigation
      beginRestore(window.location.pathname);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  });

  // Navigation completion signal: pathname changed after router.push.
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || pathname === pending.origin) return;
    pendingRef.current = null;
    clearTimers();
    typeLines([OUTRO_LINE], () => {
      later(finish, 350);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Unmount cleanup.
  useEffect(
    () => () => {
      clearTimers();
      document.body.style.overflow = "";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!active) return null;
  return (
    <div className={`${styles.overlay} ${leaving ? styles.leaving : ""}`} role="status" aria-label="正在加载页面">
      <div className={styles.window}>
        <div className={styles.titlebar}><span>NEON_OS / NAV.SYS</span><span className={styles.busy}>● BUSY</span></div>
        <div className={styles.termBody} aria-live="polite">
          {typed.map((line, index) => <p key={index} className={styles.line}>{line}</p>)}
          {current && <p className={styles.line}>{current}<span className={styles.cursor} aria-hidden="true">_</span></p>}
        </div>
      </div>
    </div>
  );
}

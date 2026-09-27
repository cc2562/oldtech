"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="NEON / NOTES 首页">
        <span className={styles.mark} aria-hidden="true">N<span>·</span></span>
        <span className={styles.wordmark}>NEON<span>/</span>NOTES</span>
      </Link>
      <nav className={styles.nav} aria-label="主导航">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>首页 <span>01</span></Link>
        <Link href="/components" aria-current={pathname === "/components" ? "page" : undefined}>组件展台 <span>02</span></Link>
      </nav>
      <span className={styles.edition}>PERSONAL SIGNAL <b>·</b> 2026</span>
    </header>
  );
}

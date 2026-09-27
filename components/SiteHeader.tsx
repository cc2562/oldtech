"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label={`${name} 首页`}>
        <span className={styles.mark} aria-hidden="true">N<span>·</span></span>
        <span className={styles.wordmark}>{name}</span>
      </Link>
      <nav className={styles.nav} aria-label="主导航">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>首页 <span>01</span></Link>
        <Link href="/posts" aria-current={pathname.startsWith("/posts") ? "page" : undefined}>文章列表 <span>02</span></Link>
        <Link href="/links" aria-current={pathname === "/links" ? "page" : undefined}>友情链接 <span>03</span></Link>
        <Link href="/components" aria-current={pathname === "/components" ? "page" : undefined}>组件展台 <span>04</span></Link>
      </nav>
      <span className={styles.edition}>PERSONAL SIGNAL <b>·</b> 2026</span>
    </header>
  );
}

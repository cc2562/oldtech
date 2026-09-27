"use client";

import { useRef } from "react";
import { RetroButton } from "./RetroButton";
import { site } from "@/lib/site";
import styles from "./SiteInfoDialog.module.css";

export function SiteInfoDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <RetroButton ref={triggerRef} variant="chrome" compact onClick={() => dialogRef.current?.showModal()}>站点说明 ↗</RetroButton>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="site-info-title" onClose={() => triggerRef.current?.focus()} onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close(); }}>
        <div className={styles.titlebar}><span className={styles.icon}>i</span><span id="site-info-title">ABOUT_NEON.NOT</span><button type="button" onClick={() => dialogRef.current?.close()} aria-label="关闭站点说明">×</button></div>
        <div className={styles.body}>
          <div className={styles.symbol} aria-hidden="true">N<span>·</span></div>
          <div><h2>{site.name}</h2><p>{site.description} 当前展示的是视觉与组件演示，作者信息和文章均为占位内容。</p><p className={styles.version}>SYSTEM VERSION 0.2 / PERSONAL ARCHIVE</p></div>
        </div>
        <div className={styles.actions}><RetroButton compact onClick={() => dialogRef.current?.close()}>确定</RetroButton></div>
      </dialog>
    </>
  );
}

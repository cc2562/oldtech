"use client";

import { useState } from "react";
import { RetroButton } from "./RetroButton";
import styles from "./ButtonDemo.module.css";

export function ButtonDemo() {
  const [count, setCount] = useState(0);
  const [channel, setChannel] = useState<"A" | "B">("A");

  return (
    <div className={styles.demo}>
      <div className={styles.controls}>
        <RetroButton onClick={() => setCount((value) => value + 1)}>发送信号 ↗</RetroButton>
        <RetroButton variant="chrome" onClick={() => setCount(0)}>重置计数</RetroButton>
        <RetroButton variant="violet" onClick={() => setChannel((value) => value === "A" ? "B" : "A")}>切换频道</RetroButton>
        <RetroButton disabled>暂不可用</RetroButton>
      </div>
      <p className={styles.readout} aria-live="polite"><span>INTERACTION LOG</span> 已发送 {count} 次信号 · 当前频道 {channel}</p>
      <p className={styles.hint}>试试悬停、按下与 Tab 键聚焦按钮。</p>
    </div>
  );
}

"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { PostCategory } from "@/lib/posts";
import styles from "./ChannelKnob.module.css";

export type Channel = "全部" | PostCategory;

const channels: Channel[] = ["全部", "技术", "设计", "生活"];
const angles = [-45, 45, 135, -135];

function angularDistance(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export function ChannelKnob({ value, onChange, compact = false }: { value: Channel; onChange: (value: Channel) => void; compact?: boolean }) {
  const dialRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const index = channels.indexOf(value);

  function indexFromPointer(event: PointerEvent<HTMLDivElement>): number | null {
    const rect = dialRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.12) return null;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    return angles.reduce((best, candidate, candidateIndex) =>
      angularDistance(angle, candidate) < angularDistance(angle, angles[best]) ? candidateIndex : best, 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(index + 1, channels.length - 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(index - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = channels.length - 1;
    else return;
    event.preventDefault();
    onChange(channels[next]);
  }

  return (
    <div className={`${styles.instrument} ${compact ? styles.compact : ""}`}>
      <div className={styles.heading}><span>CHANNEL SELECT</span><span className={styles.serial}>CH–04 / ANALOG</span></div>
      <div className={styles.control}>
        <div className={styles.labels}>
          {channels.map((channel, channelIndex) => (
            <button
              key={channel}
              type="button"
              className={`${styles.label} ${styles[`label${channelIndex}`]} ${value === channel ? styles.selected : ""}`}
              onClick={() => onChange(channel)}
              aria-pressed={value === channel}
            >
              <span className={styles.labelIndex}>0{channelIndex + 1}</span>{channel}
            </button>
          ))}
        </div>
        <div
          ref={dialRef}
          className={styles.dial}
          role="slider"
          tabIndex={0}
          aria-label="文章频道"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={index}
          aria-valuetext={`${value}频道`}
          onKeyDown={handleKeyDown}
          onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); setPreviewIndex(indexFromPointer(event)); }}
          onPointerMove={(event) => { if (dragging.current) setPreviewIndex(indexFromPointer(event)); }}
          onPointerUp={(event) => { const next = indexFromPointer(event); dragging.current = false; setPreviewIndex(null); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (next !== null) onChange(channels[next]); }}
          onPointerCancel={() => { dragging.current = false; setPreviewIndex(null); }}
        >
          <div className={styles.grip} style={{ transform: `rotate(${angles[previewIndex ?? index]}deg)` }}><span className={styles.needle} /></div>
          <span className={styles.center} aria-hidden="true">N/N</span>
        </div>
      </div>
      <p className={styles.readout}><span className={styles.led} /> 当前频道 <strong>{value}</strong></p>
    </div>
  );
}

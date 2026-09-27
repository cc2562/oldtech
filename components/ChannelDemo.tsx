"use client";

import { useState } from "react";
import { ChannelKnob, type Channel } from "./ChannelKnob";
import styles from "./ChannelDemo.module.css";

export function ChannelDemo() {
  const [channel, setChannel] = useState<Channel>("全部");
  return <div className={styles.demo}><ChannelKnob value={channel} onChange={setChannel} compact /><div className={styles.note}><p>INPUT DEVICE / CH–04</p><h3>旋转频道，检索不同频段。</h3><span aria-live="polite">当前选择：{channel}</span><small>可拖动旋钮、点击档位，或聚焦旋钮后使用方向键。</small></div></div>;
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HoverCoverPreviewHandle } from "@/components/HoverCoverPreview";
import type { PreviewBridge } from "@/components/PostRow";

/**
 * Wires the floating cover preview to a list of PostRows. Only fine pointer
 * devices with real hover get a bridge; touch / coarse pointers render the
 * plain text list. Used by the /posts archive and the component showcase.
 */
export function useCoverPreview() {
  const previewRef = useRef<HoverCoverPreviewHandle>(null);
  const [canPreview, setCanPreview] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanPreview(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!canPreview) previewRef.current?.hide();
  }, [canPreview]);

  const preview = useMemo<PreviewBridge | null>(() => {
    if (!canPreview) return null;
    return {
      show: (cover, x, y, label) => previewRef.current?.show(cover, x, y, label),
      move: (x, y) => previewRef.current?.move(x, y),
      hide: () => previewRef.current?.hide(),
    };
  }, [canPreview]);

  return { previewRef, preview };
}

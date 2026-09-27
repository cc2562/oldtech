"use client";

import { useCallback, useEffect, useState, type ImgHTMLAttributes } from "react";
import styles from "./LazyImage.module.css";

type LazyImageProps = {
  src: string;
  alt: string;
  /** First-screen critical image: load eagerly with high priority instead of lazily. */
  eager?: boolean;
  /** Label inside the code-style placeholder; defaults to the file name from src. */
  label?: string;
  /** object-fit of the inner image. */
  fit?: "cover" | "contain";
  /** Post-load reveal effect; "none" shows the image instantly. */
  effect?: "glitch" | "none";
  /**
   * "fill" (default) absolutely fills a sized parent; "natural" keeps the img
   * in normal flow at its intrinsic size — required when neither width/height
   * nor a sized parent container is available (e.g. Markdown/external images).
   */
  layout?: "fill" | "natural";
  /** Extra classes on the wrapper (parent module positioning hooks). */
  className?: string;
  width?: number;
  height?: number;
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
  onError?: () => void;
};

/**
 * Site-wide image loading strategy:
 * - Non-critical images use native `loading="lazy"`; browsers without support
 *   simply ignore the attribute and load normally (graceful degradation — the
 *   image still renders, just without deferral).
 * - The code-style placeholder sits *behind* the img, so it shows through while
 *   the transparent, still-loading image occupies the box; no JS is required
 *   for the image itself to appear once loaded.
 * - Once JS marks the image loaded, a short glitch transition plays and the
 *   placeholder fades out (matters for images with transparency).
 * - `loadedSrc !== src` keeps state per source, so dynamically swapped or
 *   newly inserted images (hover preview, rich-text uploads) re-run the cycle.
 */
export function LazyImage({ src, alt, eager = false, label, fit = "cover", effect = "glitch", layout = "fill", className = "", width, height, referrerPolicy, onError }: LazyImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const loaded = loadedSrc === src;
  // Marks a JS-hydrated render: only then may CSS hide the img until load
  // completes (progressive decoding / stale pixels on src swap stay invisible).
  // SSR and no-JS never get the flag, so images render normally there.
  const [js, setJs] = useState(false);
  useEffect(() => setJs(true), []);
  // Cached images can finish before hydration; the load event already fired.
  // Compare against the src prop (el.src/currentSrc resolve to absolute URLs
  // and would never match a relative prop, leaving the image stuck hidden).
  const ref = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth > 0) setLoadedSrc(src);
  }, [src]);

  const tag = (label ?? src.split("/").pop()?.split("?")[0] ?? "IMAGE.BMP").toUpperCase();
  const sizing = width && height ? { width: `${width}px`, maxWidth: "100%", aspectRatio: `${width} / ${height}` } : undefined;

  return (
    <span className={`${styles.lazy} ${className}`} data-js={js || undefined} data-loaded={loaded || undefined} data-fit={fit} data-effect={effect} data-layout={layout} style={sizing}>
      <img
        ref={ref}
        className={styles.img}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        referrerPolicy={referrerPolicy}
        onLoad={() => setLoadedSrc(src)}
        onError={onError}
      />
      <span className={styles.ph} aria-hidden="true">
        <span>&gt; decode {tag}</span>
        <span className={styles.phBar}>██████░░░░ LOADING<i className={styles.phCursor}>_</i></span>
      </span>
    </span>
  );
}

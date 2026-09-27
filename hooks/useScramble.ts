"use client";

import { useEffect, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}—=+*^?#01アイウエオカキクケコサシスセソ";

const randomGlyphs = (length: number) =>
  Array.from({ length }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("");

/**
 * Cyberpunk-style text scramble. While `scrambling` is true the output is a
 * flickering random string of the target's length; when it flips to false the
 * real text locks in left-to-right. Reduced motion returns the target as-is.
 */
export function useScramble(target: string, scrambling: boolean) {
  const [output, setOutput] = useState(target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOutput(target);
      return;
    }
    if (scrambling) {
      const id = setInterval(() => setOutput(randomGlyphs(target.length)), 55);
      return () => clearInterval(id);
    }
    let step = 0;
    const total = target.length + 2;
    const id = setInterval(() => {
      step++;
      if (step >= total) {
        setOutput(target);
        clearInterval(id);
        return;
      }
      setOutput(target.slice(0, step) + randomGlyphs(Math.max(0, target.length - step)));
    }, 90);
    return () => clearInterval(id);
  }, [target, scrambling]);

  return output;
}

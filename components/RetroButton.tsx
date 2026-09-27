import Link from "next/link";
import type { ComponentPropsWithRef, ReactNode } from "react";
import styles from "./RetroButton.module.css";

export type ButtonVariant = "signal" | "chrome" | "violet";

function classFor(variant: ButtonVariant, compact = false) {
  return `${styles.button} ${styles[variant]}${compact ? ` ${styles.compact}` : ""}`;
}

type RetroButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  compact?: boolean;
  children: ReactNode;
};

export function RetroButton({ variant = "signal", compact = false, className = "", type = "button", ref, ...props }: RetroButtonProps) {
  return <button ref={ref} type={type} className={`${classFor(variant, compact)} ${className}`} {...props} />;
}

export function RetroLink({ href, children, variant = "signal", compact = false }: { href: string; children: ReactNode; variant?: ButtonVariant; compact?: boolean }) {
  return <Link href={href} className={classFor(variant, compact)}>{children}</Link>;
}

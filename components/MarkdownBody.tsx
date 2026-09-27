import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { LazyImage } from "./LazyImage";
import styles from "./MarkdownBody.module.css";

/**
 * Markdown article body (react-markdown + remark-gfm + rehype-highlight).
 * Rendered on the server, so the Markdown toolchain never ships to the client.
 * Typography comes from the shared `.prose` container; the component only adds
 * what Markdown needs on top: lazy images, link target rules and table scroll.
 */
const components: Components = {
  img: ({ src, alt, title }) => {
    if (typeof src !== "string" || !src.trim()) return null;
    return (
      <LazyImage
        className="proseImage"
        src={src}
        alt={alt ?? ""}
        label={title}
        layout="natural"
        effect="none"
        referrerPolicy="no-referrer"
      />
    );
  },
  a: ({ href, children, title }) => {
    if (typeof href !== "string" || !href.trim()) return <span>{children}</span>;
    // External links open in a new window; internal links stay in-app so the
    // PJAX navigation system keeps handling them.
    return /^https?:\/\//i.test(href) ? (
      <a href={href} title={title} target="_blank" rel="noopener noreferrer">{children}</a>
    ) : (
      <a href={href} title={title}>{children}</a>
    );
  },
  table: ({ children }) => (
    <div className={styles.tableWrap}>
      <table>{children}</table>
    </div>
  ),
};

export function MarkdownBody({ source }: { source: string }) {
  return (
    <div className={styles.body}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

import type { Metadata } from "next";
import { PixelField } from "@/components/PixelField";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${site.name} — 个人博客 Demo`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="site-frame">
          <SiteHeader />
          <main id="main-content">{children}</main>
          <footer className="site-footer">
            <p className="footer-line"><span className="footer-prompt">{"C:\\NEON\\NOTES>"}</span> logoff --user=visitor</p>
            <p className="footer-line muted">© 2026 {site.name} · 一份正在成形的个人博客 / DESIGN DEMO · SESSION CLOSED</p>
            <p className="footer-line"><span className="footer-prompt">{"C:\\NEON\\NOTES>"}</span> exit<span className="footer-cursor" aria-hidden="true">_</span></p>
          </footer>
        </div>
        <PixelField />
      </body>
    </html>
  );
}

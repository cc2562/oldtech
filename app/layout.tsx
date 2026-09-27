import type { Metadata } from "next";
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
            <span>© 2026 {site.name}</span>
            <span>一份正在成形的个人博客 / DESIGN DEMO</span>
          </footer>
        </div>
      </body>
    </html>
  );
}

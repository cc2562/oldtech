import type { Metadata } from "next";
import { PixelField } from "@/components/PixelField";
import { PjaxProvider } from "@/components/PjaxProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { getSite } from '@/lib/cms';
import "../globals.css";

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return { title: { default: site.name, template: `%s | ${site.name}` }, description: site.description, icons: { icon: '/favicon.svg' } };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSite();
  return (
    <html lang="zh-CN">
      <body>
        <div className="site-frame">
          <SiteHeader name={site.name} />
          <main id="main-content" tabIndex={-1}>{children}</main>
          <footer className="site-footer">
            <p className="footer-line"><span className="footer-prompt">{"C:\\NEON\\NOTES>"}</span> logoff --user=visitor</p>
            <p className="footer-line muted">© {new Date().getFullYear()} {site.name} · SESSION CLOSED</p>
            <p className="footer-line"><span className="footer-prompt">{"C:\\NEON\\NOTES>"}</span> exit<span className="footer-cursor" aria-hidden="true">_</span></p>
          </footer>
        </div>
        <PixelField />
        <PjaxProvider />
      </body>
    </html>
  );
}

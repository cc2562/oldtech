import type { Metadata } from "next";
import { AuthorCard } from "@/components/AuthorCard";
import { LinkBrowser } from "@/components/LinkBrowser";
import { RetroWindow } from "@/components/RetroWindow";
import { getFriendLinks, getSite } from '@/lib/cms';
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "友情链接",
  description: "站长档案与友情链接中继站。",
};

export const dynamic = 'force-dynamic';

export default async function LinksPage() {
  const [friendLinks, site] = await Promise.all([getFriendLinks(), getSite()]);
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.panelCode}>LINKS.SYS // PANEL 03</p>
        <h1 className={styles.title}>友情链接<span>RELAY</span></h1>
        <p className={styles.sub}>EXTERNAL SIGNALS · {String(friendLinks.length).padStart(2, "0")} LINKS</p>
      </header>

      <section className={styles.section} aria-labelledby="operator-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>01 // OPERATOR</p>
            <h2 id="operator-title">站长档案<span>_</span></h2>
          </div>
          <p className={styles.hint}>PROFILE · SOCIAL CHANNELS</p>
        </div>
        <RetroWindow title="OPERATOR_PROFILE.EXE" eyebrow="STATION MASTER / PROFILE CARD">
          <AuthorCard site={site} />
        </RetroWindow>
      </section>

      <section className={styles.section} aria-labelledby="links-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>02 // SIGNAL RELAY</p>
            <h2 id="links-title">友链中继站<span>_</span></h2>
          </div>
          <p className={styles.hint}>CLICK A CARD · OPENS IN NEW TAB</p>
        </div>
        <LinkBrowser links={friendLinks} />
      </section>
    </div>
  );
}

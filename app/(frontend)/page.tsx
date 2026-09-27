import { HomeConsole } from "@/components/HomeConsole";
import { getPublishedPosts, getSite } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // The "最近的信号" cap is admin-editable (后台 → 站点管理 → 列表设置).
  const site = await getSite();
  const posts = await getPublishedPosts({ limit: site.homeJournalLimit });
  return <HomeConsole posts={posts} author={site.author} site={site} />;
}

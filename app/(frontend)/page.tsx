import { HomeConsole } from "@/components/HomeConsole";
import { getPublishedPosts, getSite } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [posts, site] = await Promise.all([getPublishedPosts(), getSite()]);
  return <HomeConsole posts={posts} author={site.author} site={site} />;
}

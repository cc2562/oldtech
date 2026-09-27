import type { Metadata } from "next";
import { PostsArchive } from "@/components/PostsArchive";
import { getPublishedPosts, getSite } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "文章档案",
  description: "技术、思想与生活频道的全部文章。",
};

export default async function PostsPage() {
  // Batch size comes from the admin (后台 → 站点管理 → 列表设置).
  const [posts, site] = await Promise.all([getPublishedPosts(), getSite()]);
  return <PostsArchive posts={posts} batchSize={site.archiveBatchSize} />;
}

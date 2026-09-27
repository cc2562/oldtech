import type { Metadata } from "next";
import { PostsArchive } from "@/components/PostsArchive";
import { getPublishedPosts } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "文章档案",
  description: "技术、设计与生活频道的全部文章。",
};

export default async function PostsPage() {
  const posts = await getPublishedPosts();
  return <PostsArchive posts={posts} />;
}

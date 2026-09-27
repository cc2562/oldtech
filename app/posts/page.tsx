import type { Metadata } from "next";
import { PostsArchive } from "@/components/PostsArchive";
import { posts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "文章档案",
  description: "NEON / NOTES 的全部文章索引：技术、设计与生活频道。演示内容。",
};

export default function PostsPage() {
  return <PostsArchive posts={posts} />;
}

import { HomeConsole } from "@/components/HomeConsole";
import { posts } from "@/lib/posts";
import { site } from "@/lib/site";

export default function HomePage() {
  return <HomeConsole posts={posts} author={site.author} />;
}

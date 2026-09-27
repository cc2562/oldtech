export type PostCategory = "技术" | "设计" | "生活";

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  publishedAt: string;
  readingMinutes: number;
  issue: string;
  featured?: boolean;
  isDemo?: boolean;
}

// The UI consumes this shape, not the storage source. A future CMS adapter can
// return PostSummary[] without changing the home page or article cards.
export const posts: PostSummary[] = [
  {
    id: "signal-001",
    slug: "a-small-future-on-the-desk",
    title: "桌面上的一小块未来",
    excerpt: "从透明外壳、旋钮与状态灯出发，重新想象那些让人愿意触碰的数字界面。",
    category: "设计",
    publishedAt: "2026-09-18",
    readingMinutes: 6,
    issue: "001",
    featured: true,
    isDemo: true,
  },
  {
    id: "signal-002",
    slug: "the-web-should-feel-alive",
    title: "网页应该有一点触感",
    excerpt: "按钮的回弹、层次与光泽，如何在不干扰阅读的前提下，让交互重新变得有趣。",
    category: "技术",
    publishedAt: "2026-09-12",
    readingMinutes: 5,
    issue: "002",
    isDemo: true,
  },
  {
    id: "signal-003",
    slug: "after-rain-neon",
    title: "雨停以后，城市还亮着",
    excerpt: "傍晚绕路回家的随手记录：霓虹、旧招牌，以及生活里那些值得慢一点看的东西。",
    category: "生活",
    publishedAt: "2026-09-04",
    readingMinutes: 4,
    issue: "003",
    isDemo: true,
  },
  {
    id: "signal-004",
    slug: "colors-in-the-dark",
    title: "给深色界面留一束光",
    excerpt: "试着让亮黄与紫色各司其职：前者指引操作，后者托起内容。",
    category: "设计",
    publishedAt: "2026-08-27",
    readingMinutes: 7,
    issue: "004",
    isDemo: true,
  },
];

export interface FriendLink {
  id: string;
  name: string;
  description: string;
  url: string;
  iconUrl?: string;
  issue: string;
  isDemo?: boolean;
}

export interface SocialLink {
  id: string;
  label: string;
  handle: string;
  url: string;
  isDemo?: boolean;
}

// The UI consumes these shapes, not the storage source. A future CMS adapter
// can return FriendLink[] / SocialLink[] without changing the cards or page.
// All entries are demo content pointing to real, readable pages; swap in real
// friend sites and social accounts when available.
export const friendLinks: FriendLink[] = [
  {
    id: "relay-001",
    name: "Mozilla MDN",
    description: "开放 Web 的技术文档库，查询标准 API 时最常转发的信号源。",
    url: "https://developer.mozilla.org/zh-CN/",
    issue: "001",
    isDemo: true,
  },
  {
    id: "relay-002",
    name: "CSS-Tricks",
    description: "关于层叠、布局与各种前端技巧的老牌笔记站。",
    url: "https://css-tricks.com/",
    issue: "002",
    isDemo: true,
  },
  {
    id: "relay-003",
    name: "Smashing Magazine",
    description: "设计与前端交叉地带的长期读物，排版与可用性并重。",
    url: "https://www.smashingmagazine.com/",
    issue: "003",
    isDemo: true,
  },
  {
    id: "relay-004",
    name: "neal.fun",
    description: "把浏览器当作玩具的一系列互动小实验，灵感补给站。",
    url: "https://neal.fun/",
    issue: "004",
    isDemo: true,
  },
  {
    id: "relay-005",
    name: "The Pudding",
    description: "用数据与视觉讲故事的编辑部，每篇都是精心制作的窗口。",
    url: "https://pudding.cool/",
    issue: "005",
    isDemo: true,
  },
  {
    id: "relay-006",
    name: "Internet Archive",
    description: "打捞旧网页与旧软件的时光机，怀旧信号的终点站。",
    url: "https://archive.org/",
    issue: "006",
    isDemo: true,
  },
];

export const socialLinks: SocialLink[] = [
  {
    id: "social-github",
    label: "GitHub",
    handle: "github.com",
    url: "https://github.com/",
    isDemo: true,
  },
  {
    id: "social-mastodon",
    label: "Mastodon",
    handle: "mastodon.social",
    url: "https://mastodon.social/",
    isDemo: true,
  },
  {
    id: "social-mail",
    label: "邮件",
    handle: "operator@neon-notes.demo",
    url: "mailto:operator@neon-notes.demo",
    isDemo: true,
  },
  {
    id: "social-rss",
    label: "RSS",
    handle: "w3.org/blog/feed",
    url: "https://www.w3.org/blog/news/feed/",
    isDemo: true,
  },
];

import { posts, type PostSummary } from "./posts";

export interface DemoComment {
  id: string;
  author: string;
  postedAt: string;
  text: string;
}

export interface PostDetail extends PostSummary {
  body: string[];
  pullQuote: string;
  comments: DemoComment[];
}

// Demo article bodies and comments, clearly marked as placeholder content via
// isDemo (inherited from PostSummary). The detail page consumes PostDetail;
// cards keep consuming PostSummary, so the home page is unaffected.
const detailsById: Record<string, { body: string[]; pullQuote: string; comments: DemoComment[] }> = {
  "signal-001": {
    body: [
      "透明外壳流行过很多次，每一次都像在回答同一个问题：我们为什么想看见机器的内部？也许是因为看得见的结构让人安心——齿轮、灯、走线，所有因果都摆在明面上，不像今天的界面，把一切藏进一块黑玻璃里。",
      "做这套界面的时候，我给自己定了一条规矩：每一个装饰都要对应一个真实的交互。状态灯不是贴图，它亮着是因为系统真的在线；旋钮不是摆拍，它真的可以转动四个档位。拟物的意义不在于复古，而在于让操作有迹可循。",
      "声音和手感也是设计的一部分。旧设备按键的段落感、旋钮的阻尼、甚至风扇的底噪，都在告诉你机器听见了你。网页没有物理反馈，但至少可以用位移、高光和节奏，把这一点点「被听见」的感觉还回来。",
      "未来不一定长在科幻电影里。它也可以很小，小到只占据桌面的一角：一个会呼吸的指示灯，一块可以转动的旋钮，一扇写着文件名的旧窗口。",
    ],
    pullQuote: "拟物的意义不在于复古，而在于让操作有迹可循。",
    comments: [
      { id: "c-001-1", author: "CRT_1999", postedAt: "2026.09.19 21:04", text: "透明外壳那几段深有同感，看得见走线的设备就是更让人放心。" },
      { id: "c-001-2", author: "信号塔下的猫", postedAt: "2026.09.20 08:47", text: "期待旋钮的阻尼手感模拟，滚动时的段落感也许会很有趣。" },
      { id: "c-001-3", author: "guest_042", postedAt: "2026.09.21 13:22", text: "「被听见的感觉」这个说法很准确，收藏了。" },
    ],
  },
  "signal-002": {
    body: [
      "很长一段时间里，网页按钮变得越来越扁、越来越安静。扁平化解决了混乱的质感竞赛，却也顺手拿走了一些东西——你不再确定哪里可以按，按下之后也不确定它是否听见了你。",
      "触感不等于拟物堆砌。一个 2 像素的按下位移、一层短暂的高光变化、一次回弹，就足以建立「这里发生了交互」的确认感。关键在于反馈必须即时、短促，并且和操作一一对应。",
      "性能是触感的底线。任何超过一帧延迟的反馈都会被大脑判定为「迟钝」，所以动画要尽量走合成器，颜色变化优先于布局变化，物理模拟的粒子数量要有预算。华丽的卡顿不如朴素的流畅。",
      "这篇文章的结尾没有结论，只有一个建议：下次做按钮的时候，先别想它像什么，先想想它「答不答应」。",
    ],
    pullQuote: "华丽的卡顿不如朴素的流畅。",
    comments: [
      { id: "c-002-1", author: "帧率警察", postedAt: "2026.09.13 10:15", text: "「反馈超过一帧就是迟钝」——应该把这句话贴在很多产品团队的墙上。" },
      { id: "c-002-2", author: "momo", postedAt: "2026.09.14 18:27", text: "试了展台里的按钮，按下去那一下真的很解压。" },
    ],
  },
  "signal-003": {
    body: [
      "雨是在傍晚停的。云层还没散，街灯先亮了起来，积水把霓虹揉成一条一条的颜色，贴在柏油路上。我绕了远路回家，只为了让这段路长一点。",
      "老城区的招牌有一种过时的真诚。字体很大，灯管很亮，坏了也不修，就让它缺一笔少一划地闪。新店的灯箱完美得多，但你不会停下来看它。",
      "拍照的时候我在想，记录这件事的意义大概不是保存画面，而是保存「当时愿意停下来」的自己。画面会褪色，那个瞬间的心情不会，只要你写过一遍。",
      "回家以后雨又下了起来。城市还亮着，我的备忘录里多了几行字。这样就够了。",
    ],
    pullQuote: "记录的意义不是保存画面，而是保存当时愿意停下来的自己。",
    comments: [
      { id: "c-003-1", author: "夜航员", postedAt: "2026.09.05 23:58", text: "缺一笔少一划的招牌那个观察太准了，完美的东西确实不值得停留。" },
      { id: "c-003-2", author: "青苔", postedAt: "2026.09.06 19:30", text: "读完也想去雨后的街上走一圈。" },
    ],
  },
  "signal-004": {
    body: [
      "深色界面最难的不是把背景调暗，而是决定光从哪里来。全暗的界面像一间没有窗的屋子，待久了会累；到处都亮的界面则是另一种噪音。光是稀缺资源，要省着用。",
      "这套配色的分工很明确：亮黄只给「现在可以做某件事」的地方——主按钮、当前状态、焦点框；紫色负责氛围，它托住面板、晕开背景，从不直接指挥你。两种颜色各司其职，界面就有了秩序。",
      "对比度是另一根支柱。装饰可以放肆，文字必须克制：正文字色与背景的对比度要足够，重要的信息不能只靠颜色区分，还要有文字、形状或位置作为备份。",
      "最后留一道开放题：如果界面是一间暗室，你希望下一束光打在哪里？",
    ],
    pullQuote: "亮黄指引操作，紫色托起内容——两种颜色各司其职。",
    comments: [
      { id: "c-004-1", author: "色温 2700K", postedAt: "2026.08.28 16:41", text: "「光是稀缺资源」这个比喻好，深色主题确实容易做成均匀发光的塑料板。" },
      { id: "c-004-2", author: "guest_117", postedAt: "2026.08.30 09:12", text: "下一束光请打在评论区输入框上（笑）。期待它能真正开放的那天。" },
      { id: "c-004-3", author: "暗室爱好者", postedAt: "2026.09.01 22:05", text: "对比度那段说到点子上了，装饰和文字的预算要分开算。" },
    ],
  },
};

export const postDetails: PostDetail[] = posts.map((post) => ({
  ...post,
  ...detailsById[post.id],
}));

export function getPostDetail(slug: string) {
  return postDetails.find((detail) => detail.slug === slug);
}

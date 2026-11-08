"use client";

import { useLocale } from "@/lib/use-locale";

type Language = "zh" | "en";

const copy = {
  zh: {
    archive: "日常生活的收藏档案", made: "始于 2026 · 用心制作",
    journal: "日记", about: "关于", guestbook: "留言簿", leaveNote: "留下一句话",
    eyebrow: "✳ 留一处空间，收藏生活", headlineA: "生活由", headlineB: "点滴小事", headlineC: "构成。",
    intro: "安静地收藏日子、流转的思绪、熟悉的地方，以及那些值得留存的瞬间。把生活一点一点收集起来。",
    wander: "翻阅日常 ↗", volume: "第 01 卷 — 故事的开始", still: "慢慢来",
    stillCaption: "关于慢生活的一次练习 ✳",
    ticker: "记忆是小小的时光机　✳　收集瞬间，而不是物品　✳　再多停留一会儿　✳",
    journalLabel: "日记 / 001", collected: "收藏的", moments: "瞬间。",
    journalIntroA: "不是每一天都需要特别精彩。", journalIntroB: "有些日子，只需要被好好记住。",
    read: "读一读这段时光 ↗", quoteLabel: "关于好好生活的一点想法",
    quoteA: "平凡日常里也有美。", quoteB: "只需要我们", quoteC: "用心看见。",
    reminder: "写给每一个正在生活的人", before: "在离开之前", leaveA: "留下", leaveB: "一点什么。",
    thanks: "每个人的生命，都是无数故事交汇的地方。谢谢你来到我的这一方小天地。",
    hello: "打个招呼 ↗", footer: "一份关于生活、记忆与瞬间的小小收藏。",
    madeSlowly: "慢慢制作，心怀热爱 · 2026",
    entries: [
      ["2026年11月06日", "一个慢下来的早晨", "窗边渐凉的咖啡，循环播放的一首歌。没有急事，也无处可赶。", "细碎日常", "sand", "慢"],
      ["2026年10月28日", "在此处与远方之间", "城市仍在向前，而我停下来片刻，看着光线悄悄改变。", "生活片段", "sage", "远方"],
      ["2026年10月12日", "写给自己的明信片", "记下那些不想遗忘的日常。也许，记得本身就是一种回家。", "写给自己", "rose", "亲爱的自己"],
    ] as string[][],
  },
  en: {
    archive: "AN ARCHIVE OF THE EVERYDAY", made: "EST. 2026 · MADE WITH FEELING",
    journal: "JOURNAL", about: "ABOUT", guestbook: "GUESTBOOK", leaveNote: "＋ LEAVE A NOTE",
    eyebrow: "✳ A LITTLE SPACE TO KEEP", headlineA: "Life is made", headlineB: "of little", headlineC: "things.",
    intro: "A quiet archive of days, passing thoughts, familiar places, and moments worth keeping. A little piece of life, collected along the way.",
    wander: "WANDER THROUGH ↗", volume: "VOL. 01 — THE BEGINNING", still: "take it slowly",
    stillCaption: "A STUDY IN SLOW LIVING ✳",
    ticker: "MEMORIES ARE LITTLE TIME MACHINES　✳　COLLECT MOMENTS, NOT THINGS　✳　STAY A LITTLE LONGER　✳",
    journalLabel: "THE JOURNAL / 001", collected: "Collected", moments: "moments.",
    journalIntroA: "Not every day needs to be extraordinary.", journalIntroB: "Some just need to be remembered.",
    read: "READ THE MOMENT ↗", quoteLabel: "A NOTE ON BEING HERE",
    quoteA: "There is beauty in the ordinary.", quoteB: "We just have to", quoteC: "notice.",
    reminder: "A REMINDER, FOR ALL OF US.", before: "BEFORE YOU GO", leaveA: "Leave a little", leaveB: "something.",
    thanks: "Every life is a story crossing countless others. Thanks for stopping by this little corner of mine.",
    hello: "SAY HELLO ↗", footer: "A LITTLE ARCHIVE OF LIFE, MEMORIES AND MOMENTS.",
    madeSlowly: "MADE SLOWLY, WITH ♡ · 2026",
    entries: [
      ["NOV 06, 2026", "A slower kind of morning", "Coffee cooling by the window. A song on repeat. Nothing urgent, and nowhere else to be.", "LITTLE THINGS", "sand", "slow"],
      ["OCT 28, 2026", "Somewhere between here and there", "The city kept moving while I stood still for a moment, watching the light change.", "FRAGMENTS", "sage", "elsewhere"],
      ["OCT 12, 2026", "Postcards to myself", "A few lines from a day I don't want to lose. Maybe remembering is its own way home.", "NOTES TO SELF", "rose", "dear me"],
    ] as string[][],
  },
};

export default function Home() {
  const language = useLocale();
  const t = copy[language];

  return (
    <main>
      <div className="topline"><span>{t.archive}</span><span>{t.made}</span></div>
      <header className="nav wrap">
        <a className="logo" href="#">sonder<span>.</span></a>
        <nav><a href="/explore">{t.journal}</a><a href="#about">{t.about}</a><a href="/guestbook">{t.guestbook}</a></nav>
        <div className="nav-actions">
          <a className="note" href="/login">{language === "zh" ? "进入日记 ↗" : "MY JOURNAL ↗"}</a>
        </div>
      </header>
      <section className="hero wrap">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{language === "zh" ? <>{t.headlineA}<br/><em>{t.headlineB}</em><br/>{t.headlineC}</> : <>Life is made<br/>of <em>little</em> things.</>}</h1>
          <p className="intro">{t.intro}</p>
          <a className="button" href="#journal">{t.wander}</a>
          <p className="foot">{t.volume}</p>
        </div>
        <div className="still"><div className="sun"/><div className="arch"/><div className="vase"/><span>{t.still}</span><small>{t.stillCaption}</small></div>
      </section>
      <div className="ticker">{t.ticker}</div>
      <section className="journal wrap" id="journal">
        <p className="eyebrow">{t.journalLabel}</p>
        <div className="heading"><h2>{t.collected} <em>{t.moments}</em></h2><p>{t.journalIntroA}<br/>{t.journalIntroB}</p></div>
        <div className="cards">{t.entries.map(([date, title, desc, tag, tone, art], i) => <article key={title}><div className={"picture " + tone}><b>0{i + 1}</b><span>{art}</span>✳</div><small>{date}　·　{tag}</small><h3>{title}</h3><p>{desc}</p><a href="#guestbook">{t.read}</a></article>)}</div>
      </section>
      <section className="quote" id="about"><p className="eyebrow">{t.quoteLabel}</p><blockquote>{language === "zh" ? <>{t.quoteA}<br/>{t.quoteB} <em>{t.quoteC}</em></> : <>There is beauty in the ordinary.<br/>We just have to <em>notice.</em></>}</blockquote><small>{t.reminder}</small></section>
      <section className="guest wrap" id="guestbook"><div><p className="eyebrow">{t.before}</p><h2>{t.leaveA}<br/><em>{t.leaveB}</em></h2></div><div><p>{t.thanks}</p><a className="button dark" href="/guestbook">{t.hello}</a></div></section>
      <footer className="wrap footer"><a className="logo" href="#">sonder<span>.</span></a><small>{t.footer}</small><small>{t.madeSlowly}</small></footer>
    </main>
  );
}

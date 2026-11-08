const memories = [
  { date: "NOV 06, 2026", title: "A slower kind of morning", text: "Coffee cooling by the window. A song on repeat. Nothing urgent, and for once, nowhere else to be.", tag: "LITTLE THINGS", tone: "sand" },
  { date: "OCT 28, 2026", title: "Somewhere between here and there", text: "The city kept moving while I stood still for a moment, watching the light change on the buildings.", tag: "FRAGMENTS", tone: "sage" },
  { date: "OCT 12, 2026", title: "Postcards to myself", text: "A few lines from a day I don't want to lose. Maybe remembering is its own way of coming home.", tag: "NOTES TO SELF", tone: "rose" },
];

export default function Home() {
  return (
    <main>
      <div className="topline"><span>AN ARCHIVE OF THE EVERYDAY</span><span>EST. 2026 · MADE WITH FEELING</span></div>
      <header className="nav wrap">
        <a className="wordmark" href="#" aria-label="Sonder home">sonder<span>.</span></a>
        <nav><a href="#journal">JOURNAL</a><a href="#about">ABOUT</a><a href="#guestbook">GUESTBOOK</a></nav>
        <a className="write-link" href="#journal">＋ <span>LEAVE A NOTE</span></a>
      </header>

      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow"><i /> A LITTLE SPACE TO KEEP</p>
          <h1>Life is made<br />of <em>little</em> things.</h1>
          <p className="intro">A quiet archive of days, passing thoughts, familiar places, and moments worth keeping. A little piece of life, collected along the way.</p>
          <a className="button" href="#journal">WANDER THROUGH <span>↗</span></a>
          <div className="hero-foot"><span>VOL. 01 — THE BEGINNING</span><span>SCROLL TO EXPLORE ↓</span></div>
        </div>
        <div className="hero-art" aria-label="Abstract still life illustration">
          <div className="sun"></div><div className="arch"></div><div className="vase"><div className="stem"></div></div>
          <div className="book book-one"></div><div className="book book-two"></div>
          <span className="art-note note-one">take it<br />slowly</span><span className="art-note note-two">FIG. 001</span>
          <div className="art-caption">A STUDY IN SLOW LIVING <span>✳</span></div>
        </div>
      </section>

      <section className="ticker"><div>MEMORIES ARE LITTLE TIME MACHINES <span>✳</span> COLLECT MOMENTS, NOT THINGS <span>✳</span> STAY A LITTLE LONGER <span>✳</span> MEMORIES ARE LITTLE TIME MACHINES <span>✳</span></div></section>

      <section className="journal wrap" id="journal">
        <div className="section-heading"><div><p className="eyebrow">THE JOURNAL / 001</p><h2>Collected <em>moments.</em></h2></div><p className="section-note">Not every day needs to be extraordinary.<br />Some just need to be remembered.</p></div>
        <div className="memory-grid">
          {memories.map((item, index) => <article className="memory-card" key={item.title}>
            <div className={`memory-image ${item.tone}`}><span className="image-index">0{index + 1}</span><span className="image-mark">✳</span><span className="image-word">{index === 0 ? "slow" : index === 1 ? "elsewhere" : "dear me"}</span></div>
            <div className="card-meta"><span>{item.date}</span><span>{item.tag}</span></div>
            <h3>{item.title}</h3><p>{item.text}</p><a className="read-more" href="#guestbook">READ THE MOMENT ↗</a>
          </article>)}
        </div>
        <div className="journal-bottom"><span>SHOWING A FEW PIECES OF THE WHOLE</span><a href="#guestbook">MORE STORIES, SOON ↗</a></div>
      </section>

      <section className="quote-section" id="about"><div className="quote-inner"><p className="eyebrow">A NOTE ON BEING HERE</p><div className="quote-mark">“</div><blockquote>There is beauty in the ordinary. We just have to <em>notice.</em></blockquote><p className="quote-by">A REMINDER, FOR ALL OF US.</p></div></section>

      <section className="guestbook wrap" id="guestbook"><div><p className="eyebrow">BEFORE YOU GO</p><h2>Leave a little<br /><em>something.</em></h2></div><div className="guestbook-copy"><p>Every life is a story crossing countless others. Thanks for stopping by this little corner of mine.</p><a className="button button-dark" href="mailto:hello@sonder.place">SAY HELLO <span>↗</span></a></div></section>

      <footer className="footer wrap"><a className="wordmark" href="#">sonder<span>.</span></a><span>A LITTLE ARCHIVE OF LIFE, MEMORIES AND MOMENTS.</span><span>MADE SLOWLY, WITH ♡ · 2026</span></footer>
    </main>
  );
}
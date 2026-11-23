import { Reveal } from '@/components/motion/Reveal';

const items = [
  {
    title: 'Blocks',
    body: 'Headings, lists, tables, code, media, toggles.',
    wide: true
  },
  {
    title: 'Selection toolbar',
    body: 'Shows only when text is selected.'
  },
  {
    title: 'Slash + drag',
    body: 'Insert with /. Reorder with the handle.'
  },
  {
    title: 'JSON document',
    body: 'save() returns a typed blocks array you can store anywhere.',
    wide: true
  }
];

export function CapabilityBoard() {
  return (
    <section className="section">
      <div className="section__inner">
        <Reveal>
          <p className="section__eyebrow">Surface</p>
          <h2>Built for product surfaces, not demos.</h2>
          <p className="section__copy">Keep your chrome. Mount the editor. Own the persistence.</p>
        </Reveal>
        <div className="cap-board">
          {items.map((item, i) => (
            <Reveal
              key={item.title}
              className={`cap-board__cell${item.wide ? ' cap-board__cell--wide' : ''}`}
              delay={0.05 * i}
            >
              <article>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

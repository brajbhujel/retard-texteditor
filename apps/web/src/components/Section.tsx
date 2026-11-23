type Props = {
  eyebrow?: string;
  title: string;
  copy?: string;
  children?: React.ReactNode;
  tight?: boolean;
};

export function Section({ eyebrow, title, copy, children, tight }: Props) {
  return (
    <section className={`section${tight ? ' section--tight' : ''}`}>
      <div className="section__inner">
        {eyebrow ? <p className="section__eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {copy ? <p className="section__copy">{copy}</p> : null}
        {children}
      </div>
    </section>
  );
}

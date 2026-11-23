import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  external?: boolean;
};

export function ArrowCta({ href, children, variant = 'primary', external }: Props) {
  const className = `arrow-cta arrow-cta--${variant}`;
  const inner = (
    <>
      <span>{children}</span>
      <span className="arrow-cta__icon" aria-hidden>
        <ArrowUpRight weight="bold" size={16} />
      </span>
    </>
  );

  if (external) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {inner}
    </Link>
  );
}

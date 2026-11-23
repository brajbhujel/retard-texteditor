'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, transform: 'translateY(18px)' }}
      whileInView={reduce ? undefined : { opacity: 1, transform: 'translateY(0px)' }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.23, 1, 0.32, 1]
      }}
    >
      {children}
    </motion.div>
  );
}

import Link from 'next/link';
import { CodeBlock } from '@/components/CodeBlock';
import { Reveal } from '@/components/motion/Reveal';

const stacks = [
  {
    name: 'React + Vite',
    href: '/docs/react',
    code: `const ref = useRef(null);
useEffect(() => {
  let editor, dead = false;
  (async () => {
    const { default: R } = await import('retard-texteditor');
    if (dead || !ref.current) return;
    editor = new R({ holder: ref.current });
  })();
  return () => { dead = true; editor?.destroy(); };
}, []);`
  },
  {
    name: 'Vue 3',
    href: '/docs/vue',
    code: `onMounted(async () => {
  editor = new RetardEditor({ holder: el.value });
  await editor.isReady;
});
onBeforeUnmount(() => editor?.destroy());`
  },
  {
    name: 'CDN',
    href: '/docs/cdn',
    code: `<script src="blok-editor.iife.js"></script>
<script src="retard-editor.umd.js"></script>
<script>
  new RetardEditor({ holder: 'editor' });
</script>`
  }
];

export function StackStrip() {
  return (
    <section className="section">
      <div className="section__inner">
        <Reveal>
          <p className="section__eyebrow">Integrate</p>
          <h2>Drop into the stack you already have.</h2>
        </Reveal>
        <div className="stack-rail">
          {stacks.map((stack, i) => (
            <Reveal key={stack.name} className="stack-rail__item" delay={0.06 * i}>
              <article className="bezel bezel--tall">
                <div className="bezel__inner">
                  <div className="stack-rail__head">
                    <h3>{stack.name}</h3>
                    <Link href={stack.href}>Docs</Link>
                  </div>
                  <CodeBlock>{stack.code}</CodeBlock>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

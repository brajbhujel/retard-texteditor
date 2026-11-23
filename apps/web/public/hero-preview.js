(() => {
  const root = document.getElementById('hero-editor');
  if (!root) return;

  const blocks = [
    { type: 'heading', text: 'A package with commitment issues' },
    { type: 'paragraph', text: 'Install it once. Mount a holder. It will still ask where the toolbar went.' },
    {
      type: 'checklist',
      items: [
        { text: 'Slash menu finds blocks it forgot existed', checked: true },
        { text: 'JSON output pretends this was always the plan', checked: false }
      ]
    },
    { type: 'quote', text: 'Zero dependencies. Infinite opinions.', caption: 'the readme, quietly' }
  ];

  root.innerHTML = `
    <div class="fake-editor" aria-hidden="true">
      <div class="fake-editor__body" data-body></div>
    </div>
  `;

  const body = root.querySelector('[data-body]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function typeInto(textNode, caret, text) {
    for (let i = 0; i < text.length; i++) {
      textNode.textContent = text.slice(0, i + 1);
      await sleep(reduce ? 0 : 34 + Math.random() * 22);
    }
    caret.remove();
    await sleep(reduce ? 0 : 380);
  }

  async function typeBlock(block) {
    if (block.type === 'heading') {
      const el = document.createElement('h2');
      el.className = 'fake-block fake-block--heading';
      const text = document.createElement('span');
      const caret = document.createElement('span');
      caret.className = 'fake-caret';
      el.append(text, caret);
      body.append(el);
      await typeInto(text, caret, block.text);
      return;
    }

    if (block.type === 'paragraph') {
      const el = document.createElement('p');
      el.className = 'fake-block fake-block--paragraph';
      const text = document.createElement('span');
      const caret = document.createElement('span');
      caret.className = 'fake-caret';
      el.append(text, caret);
      body.append(el);
      await typeInto(text, caret, block.text);
      return;
    }

    if (block.type === 'checklist') {
      const list = document.createElement('div');
      list.className = 'fake-block fake-block--checklist';
      body.append(list);
      for (const item of block.items) {
        const row = document.createElement('div');
        row.className = 'fake-check' + (item.checked ? ' is-checked' : '');
        const box = document.createElement('span');
        box.className = 'fake-check__box';
        const text = document.createElement('span');
        const caret = document.createElement('span');
        caret.className = 'fake-caret';
        row.append(box, text, caret);
        list.append(row);
        await typeInto(text, caret, item.text);
      }
      return;
    }

    if (block.type === 'quote') {
      const el = document.createElement('blockquote');
      el.className = 'fake-block fake-block--quote';
      const quote = document.createElement('span');
      const caret = document.createElement('span');
      caret.className = 'fake-caret';
      el.append(quote, caret);
      body.append(el);
      await typeInto(quote, caret, block.text);
      const caption = document.createElement('cite');
      caption.textContent = block.caption;
      el.append(caption);
      await sleep(reduce ? 0 : 380);
    }
  }

  async function run() {
    while (true) {
      body.innerHTML = '';
      for (const block of blocks) await typeBlock(block);
      await sleep(reduce ? 1400 : 2800);
    }
  }

  run();
})();

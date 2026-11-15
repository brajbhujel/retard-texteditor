import { makeBlock, uid } from './core/model.js';
export function welcomeDocument() {
  return {
    id: uid(), title: 'A little space for big ideas.', icon: 'book', cover: true, createdAt: Date.now(), updatedAt: Date.now(),
    data: {
      blocks: [
        makeBlock('paragraph', { text: 'A blank page is the beginning of something good. This is <b>your writing workspace</b> — a place to collect a thought, tell a story, or make your next big thing happen.' }),
        makeBlock('warning', { title: 'Make yourself at home', message: 'Everything here is editable. Click anywhere and start typing. Your work is saved in this browser as you go.' }),
        makeBlock('header', { level: 2, text: 'Good ideas start with a block' }),
        makeBlock('paragraph', { text: 'Build your document one piece at a time. Add headings, images, lists, tables, code, and more. Type <code>/</code> on an empty line to explore all the possibilities.' }),
        makeBlock('list', {
          style: 'unordered', items: [
            { content: '<b>Write naturally.</b> Select any text to find your formatting tools.', meta: {}, items: [] },
            { content: '<b>Find your flow.</b> Drag the six-dot handle to move a block.', meta: {}, items: [] },
            { content: '<b>Make it yours.</b> Open a block’s menu to change its type or style.', meta: {}, items: [] },
          ]
        }),
        makeBlock('header', { level: 2, text: 'A thought worth keeping' }),
        makeBlock('quote', { text: 'You don’t have to see the whole staircase. Just take the first step.', caption: 'A small reminder to begin' }),
        makeBlock('header', { level: 2, text: 'A few things to try' }),
        makeBlock('checklist', {
          items: [
            { text: 'Find a quiet corner and make yourself a coffee', checked: true },
            { text: 'Select these words and give them a little <mark>highlight</mark>', checked: false },
            { text: 'Type / on a new line and add your first block', checked: false },
            { text: 'Make a new document and start something of your own', checked: false },
          ]
        }),
        makeBlock('delimiter'),
        makeBlock('header', { level: 2, text: 'More than words' }),
        makeBlock('paragraph', { text: 'Organise a plan with a table, keep a useful code snippet, or tuck the details into a toggle. Your content stays portable: export it as <b>JSON, HTML, Markdown, or plain text</b> whenever you need it.' }),
        makeBlock('table', { withHeadings: true, content: [['The idea', 'Next step', 'Status'], ['A fresh perspective', 'Write a first draft', 'In progress'], ['Something worth sharing', 'Add a little detail', 'Up next']] }),
        makeBlock('code', { language: 'javascript', code: "import { RetardEditor } from './src/index.js';\n\nconst editor = new RetardEditor({ holder: 'editor' });\nconst document = await editor.save();" }),
        makeBlock('toggle', { title: 'A few shortcuts for your flow', text: '<b>⌘ / Ctrl + B</b> for bold, <b>⌘ / Ctrl + I</b> for italic, and <b>⌘ / Ctrl + Z</b> to undo. Press <b>Tab</b> to nest a list, and <b>⌘ / Ctrl + Enter</b> to start a paragraph below any block.', open: false }),
        makeBlock('paragraph', { text: '' }),
      ]
    },
  };
}
export function projectDocument() {
  return {
    id: uid(), title: 'The next big thing', icon: 'sparkle', cover: false, createdAt: Date.now(), updatedAt: Date.now(), data: {
      blocks: [
        makeBlock('header', { level: 2, text: 'The idea' }), makeBlock('paragraph', { text: 'What are we making, and who are we making it for?' }),
        makeBlock('header', { level: 2, text: 'What success looks like' }), makeBlock('checklist', { items: [{ text: 'Define the problem', checked: false }, { text: 'Talk to the people it matters to', checked: false }, { text: 'Build a first version', checked: false }] }),
        makeBlock('header', { level: 2, text: 'The plan' }), makeBlock('table', { withHeadings: true, content: [['Milestone', 'Owner', 'When'], ['First draft', '', ''], ['Review', '', ''], ['Launch', '', '']] }),
      ]
    }
  };
}

window.RETARD_SAMPLE_DOC = {
  blocks: [
    {
      type: 'paragraph',
      data: {
        text: 'This playground mounts <b>retard-texteditor</b> the same way your app will — Blok engine under a Retard API.'
      }
    },
    {
      type: 'paragraph',
      data: {
        text: '<b>Tip:</b> type <code>/</code> on an empty line for headings, lists, tables, code, and more.'
      }
    },
    { type: 'header', data: { text: 'What you can poke at', level: 2 } },
    {
      type: 'list',
      data: {
        style: 'unordered',
        items: [
          { content: 'Select text for the formatting toolbar', items: [] },
          { content: 'Drag the grip to reorder blocks', items: [] },
          { content: 'Watch the JSON panel update as you type', items: [] }
        ]
      }
    },
    {
      type: 'quote',
      data: {
        text: 'Install the package. Mount a holder. Ship structured documents.',
        caption: 'The whole pitch'
      }
    },
    {
      type: 'code',
      data: {
        language: 'javascript',
        code: "import RetardEditor from 'retard-texteditor';\n\nconst editor = new RetardEditor({ holder: 'editor' });\nconsole.log(await editor.save());"
      }
    },
    { type: 'paragraph', data: { text: '' } }
  ]
};

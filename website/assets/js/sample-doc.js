window.RETARD_SAMPLE_DOC = {
  blocks: [
    { type: 'paragraph', data: { text: 'This playground mounts <b>retard-texteditor</b> the same way your app will.' } },
    { type: 'warning', data: { title: 'Try the slash menu', message: 'Type / on an empty line to insert headings, lists, tables, code, and more.' } },
    { type: 'header', data: { text: 'What you can poke at', level: 2 } },
    {
      type: 'list',
      data: {
        style: 'unordered',
        items: [
          { content: 'Select text for the formatting toolbar', meta: {}, items: [] },
          { content: 'Drag the grip to reorder blocks', meta: {}, items: [] },
          { content: 'Watch the JSON panel update as you type', meta: {}, items: [] }
        ]
      }
    },
    { type: 'quote', data: { text: 'Install the package. Mount a holder. Ship structured documents.', caption: 'The whole pitch' } },
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

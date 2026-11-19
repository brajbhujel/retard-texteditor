# Retard Editor

An independent block editor. Plain JavaScript ES modules, TypeScript declarations, and no npm dependencies.

## Install

```sh
npm install retard-texteditor
```

Do not publish or push until you are ready — this package is set up so you can publish yourself with `npm publish`.

## Use (like Editor.js)

Styles and dialogs are included. Mount the editor in a few lines:

```html
<div id="editor"></div>
<script type="module">
  import RetardEditor from 'retard-texteditor';

  const editor = new RetardEditor({
    holder: 'editor',
    placeholder: 'Start writing…',
    onChange: async (instance) => {
      console.log(await instance.save());
    }
  });

  await editor.isReady;
</script>
```

Optional explicit stylesheet (already injected by default):

```js
import 'retard-texteditor/styles.css';
```

### CDN

```html
<div id="editor"></div>
<script src="https://unpkg.com/retard-texteditor/dist/retard-editor.umd.js"></script>
<script>
  const editor = new RetardEditor({ holder: 'editor' });
</script>
```

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `holder` | required | Element or element id |
| `data` | `{ blocks: [] }` | Initial document |
| `tools` | `{}` | Extra custom tools |
| `defaults` | `true` | Built-in link, colour, footnote, media, and file dialogs |
| `readOnly` | `false` | View-only mode |
| `autofocus` | `false` | Focus the first block on mount |
| `onChange` | — | `(editor, data) => void` |
| `onReady` | — | `(editor) => void` |

Set `defaults: false` if you want to handle `link`, `color`, `configure`, `files`, and related events yourself.

## Local workspace demo

```sh
npm run dev
```

Open **http://localhost:5173**. Use `PORT=3000 npm run dev` to change the port.

```sh
npm run build
```

Open **dist/index.html**, or use the built library files under `dist/retard-editor.*`.

## Included

- 18 block insertion choices: paragraphs, headings, nested lists, checklists, quotes, callouts, dividers, images, tables, code, raw HTML, embeds, bookmarks, attachments, toggles, audio, and video.
- Persistent and selection toolbars with bold, italic, underline, strikethrough, code, links, colours, subscript, superscript, footnotes, and clear formatting.
- Slash menu, Markdown shortcuts, block conversion, drag reordering, tables, undo/redo, and clipboard import.
- JSON, Markdown, HTML, and plain-text export helpers.
- Custom tool registry, read-only mode, RTL, lifecycle cleanup, and TypeScript declarations.

## Data and compatibility

Documents use the Editor.js-shaped `{ time, version, blocks: [{ id, type, data, tunes }] }` format. This is **not** a drop-in for Editor.js’s plugin class API. Custom tools use this project’s `render` / `save` contract.

YouTube and Vimeo are the supported embed providers. Uploaded files are stored as data URLs in the document (up to 10 MB each in the default handlers).

## Publish (you run this)

When you are ready:

```sh
npm run build
npm publish --access public
```

This repo will not push or publish for you.

## Checks

```sh
npm test
npm run check
npm run build
```

See [docs/API.md](docs/API.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

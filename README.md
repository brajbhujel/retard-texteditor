# Retard Editor

An independent block editor and local writing workspace. Plain JavaScript ES modules, TypeScript declarations, and no npm dependencies. It uses its own editor engine; Editor.js is not bundled or required.

## Run

Node.js 20 or newer:

```sh
npm run dev
```

Open **http://localhost:5173**. No installation step is required. Use `PORT=3000 npm run dev` to change the port.

For a build that opens without a server:

```sh
npm run build
```

Open **dist/index.html** in a modern browser. This HTML file includes the JavaScript, styles, and logo. Browser storage support for `file:` URLs varies; localhost is the recommended mode for daily use. The server and file versions have separate browser storage.

## Included

- 18 block insertion choices: paragraphs, one Heading entry with H1–H6 controls, nested bulleted/numbered lists, checklists, quotes, callouts, dividers, images, tables, code, raw HTML source, video embeds, bookmarks, attachments, toggles, audio, and video files.
- Persistent horizontal and selection toolbars with bold, italic, underline, strikethrough, code, explicit Link/URL editing, text colour, background colour, subscript, superscript, footnotes, and clearing formatting.
- A searchable slash menu, keyboard navigation, Markdown shortcuts, block conversion, duplication, moving, drag reordering, alignment, and multi-block selection.
- Paragraph splitting/merging, list indentation, editable table cells, Tab navigation, line breaks, row/column insertion before or after the selected cell, selected row/column deletion, cross-block selection deletion, clipboard import, and a separate undo/redo history.
- Image upload/URLs, captions, alternative text, borders, backgrounds, and full-width display. File uploads and pasted/dropped files are stored locally, up to 10 MB each.
- A document workspace with titles, search, autosave, local version history, outline, word counts, preview, JSON inspection, dark mode, focus mode, and responsive layouts.
- JSON, Markdown, HTML, and plain-text export. JSON, Markdown, HTML, and text import creates a new document without replacing existing work.
- A reusable editor API, custom tool registry, lifecycle cleanup, read-only mode, right-to-left direction, and TypeScript declarations.

## Data and compatibility

Documents use the Editor.js-shaped `{ time, version, blocks: [{ id, type, data, tunes }] }` format. Standard block names and data fields are supported, including older string lists and newer nested lists. The `version` is this engine's version.

This is **not a drop-in implementation of Editor.js's complete plugin API**. Custom tools use this project's `render`/`save` contract. Third-party Editor.js plugins need adapters or ports. The application does not claim every plugin in the Editor.js community catalogue.

YouTube and Vimeo are the supported embed providers. Bookmarks have editable titles/descriptions; there is no server-side metadata scraper. Raw HTML is stored and exported as escaped source, never executed. Markdown is a practical subset, not a complete CommonMark parser. Code blocks preserve language and indentation; syntax highlighting is not implemented.

Documents, files, and up to 30 snapshots per document are stored in IndexedDB in the current browser. There is no cloud sync, user account system, collaboration service, or server uploader. Clearing browser storage deletes local content. Use JSON export for a complete backup; other exports simplify some interactive content. Remote images and embeds still need network access.

## Integrate

```html
<link rel="stylesheet" href="./src/styles/sdk.css">
<div id="editor"></div>
<script type="module">
  import { RetardEditor } from './src/index.js';

  const editor = new RetardEditor({
    holder: 'editor',
    data: { blocks: [] },
    onChange: async instance => {
      const data = await instance.save();
      console.log(data);
    }
  });

  await editor.isReady;
</script>
```

The core dispatches `configure`, `files`, `link`, `color`, `footnote`, `footnotes`, and `notice` events. The workspace in `src/app.js` supplies dialogs, upload handlers, and notifications for them. An embedding application should provide its own handlers. See [docs/API.md](docs/API.md).

## Checks

```sh
npm test
npm run check
npm run build
```

- `npm test`: 45 Node tests for schema validation, URL policy, IDs, nested lists, limits, history, statistics, scoped click routing, and table operations.
- `npm run check`: syntax checks for source, build scripts, and tests.
- Open `http://localhost:5173/tests/browser.html`, or `dist/browser-tests.html` after a build, for 46 disposable DOM integration tests. These do not access the document database.

**Validation status (16 November 2026):** All 45 Node tests and all 46 browser integration tests passed in the connected Chrome browser. Source syntax, generated bundle syntax, TypeScript declarations, and the build also passed. Manual workspace checks confirmed the plus menu, heading settings, and real table typing; the temporary typing change was undone. Firefox, Safari, native clipboard, drag-and-drop, IME, and mobile keyboard behaviour still require a wider browser pass. Basic browser editing commands use `document.execCommand`, which is deprecated.

The click/focus fix scopes view changes to the actual Write/Preview/JSON tabs. The editor also preserves unchanged block DOM during structural changes. Link and colour dialogs restore the original selection after closing. See [docs/EDITOR_RESEARCH.md](docs/EDITOR_RESEARCH.md) for the upstream issues and design references behind this pass.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the researched design and implementation boundaries.

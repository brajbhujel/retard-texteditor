# Editor API

```sh
npm install retard-texteditor
```

```js
import RetardEditor from 'retard-texteditor';
```

Styles and default dialogs are applied automatically. Optional: `import 'retard-texteditor/styles.css'`. TypeScript declarations ship with the package. The local workspace demo still uses `src/styles/app.css` for its sidebar shell.

## Create an editor

```js
const editor = new RetardEditor({
  holder: document.querySelector('#editor'),
  data: { blocks: [] },
  readOnly: false,
  direction: 'ltr',
  placeholder: 'Start writing…',
  defaults: true,
  autofocus: false,
  onReady(instance) {},
  onChange(instance, data) {}
});

await editor.isReady;
const documentData = await editor.save();
```

| Method | Effect |
| --- | --- |
| `save()` | Promise resolving to a sanitized document |
| `getData()` | Synchronous document snapshot |
| `load(data)` | Validate and replace the document; reset undo history |
| `clear()` | Reset to one blank paragraph |
| `insert(type, data, index)` | Insert a block at an index; defaults to document end |
| `update(id, data)` | Merge new block data and record history |
| `delete(id)` | Delete a block, keeping a writable empty document if needed |
| `move(id, index)` | Reorder a block |
| `duplicate(id)` | Copy a block under a new ID |
| `convert(id, type, data)` | Convert a block and preserve its text where applicable |
| `focus(id, field, side)` | Focus a field at `start` or `end` |
| `setReadOnly(boolean)` | Switch editability; repeating the current state preserves DOM and focus |
| `format(action, value, label)` | Apply inline formatting; optional label inserts a named link at the caret |
| `undo()` / `redo()` | Navigate model history |
| `registerTool(name, tool)` | Register a custom block renderer |
| `destroy()` | Remove editor DOM, timers, overlays, and listeners |

The holder must be connected to the document. `load` is allowed in read-only mode. User editing and structural editing commands are blocked while read-only. Consume the `change` event or `onChange` callback for persistence; the SDK does not save documents itself.

## Application events

```js
editor.addEventListener('configure', event => {
  const block = event.detail.block;
  openYourMediaDialog(block);
});

editor.addEventListener('files', event => {
  const { files, index } = event.detail;
  uploadOrStoreFiles(files, index);
});

editor.addEventListener('notice', event => {
  showNotification(event.detail);
});
```

| Event | Detail / response |
| --- | --- |
| `configure` | `{ block }`; use `update(block.id, data)` after obtaining media data |
| `files` | `{ files, index }`; process uploads and call `insert` |
| `link` | `{ url, text }`; apply with `format('link', url, optionalLabel)`, or an empty URL to remove a link |
| `color` | `{ kind }`, where kind is `color` or `background`; apply with `format(event.detail.kind, colour)` |
| `footnote` | Collect a note; apply with `format('footnote', text)` |
| `footnotes` | `{ block }`; open an editor for its notes |
| `notice` | A human-readable status message |
| `change` | Current `{ time, version, blocks }` |

With `defaults: true` (the package default), the SDK wires these events for you. The workspace demo uses `defaults: false` and wires them in `src/app.js` so it can keep document-scoped uploads. `formatOnClose` in `src/ui/dialog.js` restores the saved range after the dialog returns focus, then applies the change. The persistent toolbar is inserted immediately before the holder and removed by `destroy()`.

## Custom block

```js
import RetardEditor, { sanitizeHTML } from 'retard-texteditor';

const editor = new RetardEditor({
  holder: 'editor',
  tools: {
    note: {
      title: 'Note',
      icon: 'file',
      description: 'A custom note block',
      render(data, readOnly) {
        return `<div data-note contenteditable="${!readOnly}">${sanitizeHTML(data.text || '')}</div>`;
      },
      save(element) {
        return { text: sanitizeHTML(element.querySelector('[data-note]').innerHTML) };
      }
    }
  }
});

editor.insert('note', { text: 'My own block' });
```

Custom renderers return HTML and must sanitize their own data. Built-in keyboard semantics target `[data-field]` elements, so custom tools requiring Enter/Tab behaviour should provide their own delegated handling. All SDK listeners are removed by `destroy`; custom listeners created outside the SDK are the integration's responsibility.

JSON import preserves registered custom tool data. HTML and Markdown exporters cover built-in block types; add renderer support in `src/core/serialization.js` for a custom type. This is not Editor.js's external plugin class contract.

## React / Next.js

Create the editor in a client component's effect after the holder exists. Dynamically import `retard-texteditor` in the effect, retain the instance in a ref, and call `destroy()` in effect cleanup. Never instantiate it during server rendering. When async initialization completes after unmount, destroy the created instance immediately.

Use `onChange` to pass data to your form state. Avoid calling `load` on every keystroke: it replaces the DOM and resets history. Call it when switching to a genuinely different document.

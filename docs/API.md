# Editor API

```sh
npm install retard-texteditor
```

```js
import RetardEditor from 'retard-texteditor';
import 'retard-texteditor/styles.css'; // optional host chrome
```

Slash menu, drag handles, selection toolbar, undo, and block tools ship with the package. Optional theme tokens and a default tool set are included.

## Create an editor

```js
const editor = new RetardEditor({
  holder: document.querySelector('#editor'),
  data: { blocks: [] },
  readOnly: false,
  placeholder: 'Type / for blocks…',
  autofocus: false,
  tokens: {},
  tools: undefined,
  onReady(instance) {},
  onChange(instance, data) {}
});

await editor.isReady;
const documentData = await editor.save();
```

| Method / property | Effect |
| --- | --- |
| `isReady` | Promise when the editor is ready |
| `save()` | Promise → serialized document JSON |
| `getData()` | Last cached document |
| `load(data)` | Replace document + refresh cache |
| `clear()` | Clear all blocks |
| `focus(atEnd?)` | Focus the editor |
| `setReadOnly(boolean)` | Toggle read-only |
| `destroy()` | Tear down |

Also exported: `createDefaultTools`, `RETARD_THEME_TOKENS`, `VERSION`.

## CDN / static

```html
<link rel="stylesheet" href="retard-editor.css">
<script src="blok-editor.iife.js"></script>
<script src="retard-editor.umd.js"></script>
<script>
  const editor = new RetardEditor({ holder: 'editor' });
</script>
```

## Events

`RetardEditor` extends `EventTarget`:

| Event | When |
| --- | --- |
| `ready` | Editor ready |
| `change` | Document changed; `event.detail` is the saved JSON |

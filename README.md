# retard-texteditor

Block editor npm package. Install, mount a holder, save structured JSON.

```sh
npm install retard-texteditor
```

```js
import RetardEditor from 'retard-texteditor';
import 'retard-texteditor/styles.css';

const editor = new RetardEditor({
  holder: 'editor',
  onChange: (instance, data) => console.log(data)
});

await editor.isReady;
```

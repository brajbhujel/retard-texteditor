# Retard Editor

Notion-like block editor npm package. Install, mount a holder, `save()` JSON blocks.

## Install

```sh
npm install retard-texteditor
```

```js
import RetardEditor from 'retard-texteditor';
// optional host chrome:
import 'retard-texteditor/styles.css';

const editor = new RetardEditor({
  holder: 'editor',
  onChange: (instance, data) => console.log(data)
});

await editor.isReady;
console.log(await editor.save());
```

## Repo layout

```text
src/        # publishable package
apps/web/   # Next.js site (landing, playground, docs + SEO)
website/    # static fallback
docs/
tests/
scripts/
```

## Local

```sh
npm run build          # library + vendor copies for the site
npm run dev            # Next.js on http://localhost:3000
npm run dev:static     # static site http://localhost:5173
```

## Checks

```sh
npm test
npm run check
npm run build
npm run build:web
```

## Publish (you run this)

```sh
npm run build
npm publish --access public
```

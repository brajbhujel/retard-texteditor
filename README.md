# Retard Editor

An independent block editor npm package. Plain JavaScript ES modules, TypeScript declarations, and no runtime dependencies.

## Install

```sh
npm install retard-texteditor
```

## Use

```js
import RetardEditor from 'retard-texteditor';

const editor = new RetardEditor({
  holder: 'editor',
  onChange: async (instance) => console.log(await instance.save())
});
```

Styles and dialogs are included. See the site docs for the full API.

## Repo layout

```text
src/        # publishable editor package
website/    # landing, playground, docs (static HTML/CSS/JS)
docs/       # contributor research notes
tests/      # node + browser tests
scripts/    # build, check, local server
```

## Local site

```sh
npm run dev
```

Opens the static site at **http://localhost:5173** (landing, playground, docs). Host the `website/` folder anywhere after `npm run build` (vendor bundles are copied into `website/assets/vendor/`).

## Publish (you run this)

```sh
npm run build
npm publish --access public
```

This repo does not push or publish for you.

## Checks

```sh
npm test
npm run check
npm run build
```

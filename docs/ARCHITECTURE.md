# Architecture and research

## Reference behaviour

The reference was the Editor.js product, documentation, and public plugin catalogue, reviewed on 15 November 2026. This project contains independently written source rather than a copy of Editor.js's code or website.

Editor.js's defining design is a document composed of independent editable blocks. Its output is structured data. Its toolbox, inline tools, and block tunes are separate extension points. The public landing page, playground, and docs site live in `website/` as static HTML/CSS/JS.

References:

- [Editor.js base concepts](https://editorjs.io/base-concepts/)
- [Configuration](https://editorjs.io/configuration/)
- [Tool contract and lifecycle](https://editorjs.io/tools-api/)
- [Block tunes](https://editorjs.io/block-tunes-api/)
- [Saving data](https://editorjs.io/saving-data/)
- [Official and community tool catalogue](https://github.com/editor-js/awesome-editorjs)
- [Official nested list tool](https://github.com/editor-js/list)
- [Official image tool](https://github.com/editor-js/image)

## How editing works

`src/core/model.js` owns the serializable block data, validation, list conversion, URL validation, statistics, and bounded history. Imported objects are copied, checked, and normalized. IDs are unique. A document always retains at least one block. Invalid or unsupported blocks cause an explicit import error rather than silently losing content.

`src/core/editor.js` owns the interactive lifecycle. Each block has one or more `contenteditable` fields. Input events synchronize the edited block into the model without replacing the active DOM, so ordinary typing does not continually reset the caret. Structural changes synchronize pending input, mutate the block array, and reconcile rows by block ID and a data signature. Unchanged rows keep their DOM identity; only changed rows are replaced, after which the caret is restored. Reapplying the current read-only state is a no-op.

`src/core/selection.js` wraps DOM Selection and Range operations. It records a block ID, field path, and character offset for history restoration. Paragraph splitting uses cloned ranges so inline markup can survive a split. Cross-block replacement retains the unselected prefix and suffix in a paragraph.

`keydown` handles the desktop editing commands. `beforeinput` handles paragraph insertion from mobile keyboards and cross-block input. Composition state defers structural commands during IME composition. These controls require cross-browser verification, especially around non-cancelable input events.

References:

- [MDN contenteditable](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/contenteditable)
- [MDN Selection](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
- [MDN beforeinput](https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event)

## Formatting and history

Native browser commands apply basic inline formatting and paste insertion. Range manipulation handles code, highlight, subscript, superscript, colour, line breaks, and footnotes. Formatting is restricted to one rich-text field at a time, including a single table cell. Persistent and floating toolbars retain their DOM and update their button state. Link and colour dialogs clone the range and restore it after closing before applying formatting. `execCommand` is deprecated; it remains a compatibility dependency of this initial implementation, not a claim of a new browser editing standard.

Undo/redo belongs to the editor model. Text snapshots are debounced, while structural edits and formatting produce immediate checkpoints. Redo is invalidated when a new edit branches from an older snapshot. History is capped at 100 states. Local document snapshots are a separate IndexedDB feature and survive page reloads.

- [MDN execCommand status and caveats](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand)

## Tools

`src/tools/registry.js` defines the built-in tools and the custom tool contract. A tool returns markup through `render`, and optionally reads its DOM through `save`. Built-in tools use delegated listeners, so replacing a changed block does not accumulate per-block listeners.

This tool API is intentionally smaller than Editor.js's class-based API. It does not emulate every core API object, every plugin lifecycle hook, or arbitrary third-party plugins. Registering a custom tool is trusted application code. Its renderer must escape untrusted values.

The built-in media tools dispatch events for application-specific dialogs and file handling. The workspace supplies these handlers. A consumer using only the SDK must supply them or hide the relevant tools.

## Persistence

`src/core/storage.js` stores documents and revisions in IndexedDB. `src/app.js` serializes writes, captures the document being saved before asynchronous work, guards competing document switches, and exposes a visible save failure state. Uploaded files are portable data URLs; their upload limit is 10 MB per file. This avoids server credentials and expiring blob URLs, but large media increases document/export size.

Version history keeps 30 snapshots per document. A JSON export includes all block data and embedded files. HTML/Markdown exports are human-readable derivatives, not guaranteed lossless replacements for JSON.

- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

## Content boundaries

The HTML sanitizer allows a small set of formatting tags and removes event handlers, scripts, iframes, SVG, style elements, and arbitrary attributes. Link URLs are protocol checked. Uploaded images accept raster data formats, and attachments do not use executable HTML data URLs. Embedded iframes are generated only from supported YouTube/Vimeo URLs. Raw HTML is shown as source.

This is client-side defence for a local editor. A server integration should independently validate and sanitize data at its trust boundary. External media still contacts its source host. Unknown custom tools are not automatically trusted by document import.

## Build and verification

The project uses native ES modules with no installed runtime dependencies. The Node server serves the source on loopback. The build script assembles modules in dependency order and produces a self-contained HTML file plus a standalone browser test page. It is a small build script for this source tree, not a general JavaScript bundler.

Node tests cover validation, history, nesting, safety policies, IDs, and statistics. Browser tests cover DOM editing, formatting, lists, tables, slash commands, read-only state, sanitization, import/export, and custom tools. All 45 Node tests and 46 browser tests passed on 16 November 2026. The browser suite ran in connected Chrome, with additional manual checks in the actual workspace. Firefox and Safari have not been verified. See [the follow-up research](EDITOR_RESEARCH.md) for upstream issues and the related fixes.

## Remaining compatibility work

- Extend the verified Chrome coverage to Firefox and Safari; manually test native clipboard, drag/drop, IME composition, mobile keyboards, and assistive technologies.
- Add an adapter layer for specific third-party Editor.js plugins when needed. The plugin catalogue is not included wholesale.
- Add more embed providers, bookmark metadata fetching, cloud uploads, or synchronized persistence only with an explicit backend design.
- Use a mature Markdown parser if strict CommonMark interoperability is required.
- Add syntax highlighting to code blocks if needed. Current code blocks are plain, language-labelled source editors.
- Profile large documents and embedded media before selecting production document limits.

# Editing behaviour research and fixes

Reviewed 16 November 2026. This is an independent editor engine. The references informed behaviour and regression coverage; their code was not copied into this project.

## The reported failure

The workspace delegated clicks through `[data-view]` while also assigning `data-view` to the body. Clicking any block, table cell, plus button, or settings icon therefore called `setView`, reapplied editing mode, and rebuilt every block. Focus disappeared and freshly opened menus closed.

View routing now accepts only buttons inside the view tab list. Reapplying the current mode does nothing. Block rendering reuses unchanged rows, and history restoration retains the current field when the earliest history entry has no saved caret.

## Sources and applied decisions

| Primary source | Observation | Application here |
| --- | --- | --- |
| [Editor.js concepts and demo](https://editorjs.io/) | Blocks, inline tools, and block settings serve different purposes; output is structured data. | Retain the block model and separate insertion, inline formatting, and block settings. |
| [Editor.js issue #2822](https://github.com/codex-team/editor.js/issues/2822) | Recreating toolbar DOM can make repeated formatting actions visibly flash. | Keep both toolbar instances mounted and update state; preserve unchanged block DOM. |
| [Editor.js PR #3027](https://github.com/codex-team/editor.js/pull/3027) | The open proposal retains its popover container during selection refresh. Its discussion also calls out stale rendering, cleanup, positioning, and keyboard timing. | Keep the toolbar container and controls stable; preserve selection across pointer interactions and dialogs; test focus explicitly. The PR was reviewed as a proposal, not treated as a released guarantee. |
| [Editor.js issue #2796](https://github.com/codex-team/editor.js/issues/2796) | Caret handling can jump between list entries or table cells when generic block commands intervene. | Keep table keyboard handling local to the cell. Enter inserts a line break; Tab advances and can extend the final row. |
| [Quill toolbar documentation](https://quilljs.com/docs/modules/toolbar) | Formatting controls can be grouped, with dropdown heading choices and separate foreground/background colours. | A horizontal toolbar, a single Heading insertion entry, an H1–H6 settings grid, explicit Link control, and two colour targets. |
| [Tiptap Highlight](https://tiptap.dev/docs/editor/extensions/marks/highlight) | Highlight marks can carry different background colours. | Save highlight colours on allowed markup and retain them through JSON and HTML export. |
| [Tiptap BubbleMenu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu) | A selection toolbar needs positioning and controlled updates. | Retain a contextual toolbar alongside persistent controls; defer selection updates and keep the menu within the viewport. |

The upstream [pull-request index](https://github.com/codex-team/editor.js/pulls) also flags preservation of tune data, sanitization during paste, and save-error propagation. These remain useful areas for regression coverage; this work does not claim to port every upstream proposal.

## Added behaviour

- Plus replaces an empty paragraph with the chosen block; on a populated block it inserts underneath.
- Heading levels remain available without filling the top-level insert menu with six entries.
- The full table-cell interior is editable. Row/column insertion and deletion target the active cell and retain at least one cell.
- Link dialogs support selected text and insertion at a caret; existing links can be edited or removed.
- Text and background colours have named swatches and custom values. Clear formatting removes the inline styling while retaining text.
- Formatting cannot wrap different table cells or separate document blocks in one inline element.
- Footnotes display immediately without rebuilding unrelated blocks.

## Verification

45 Node tests passed. 46 browser tests passed in connected Chrome, including actual link and colour dialogs, selection restoration, unchanged DOM identity, table operations, undo focus, sanitization, and import/export. Manual workspace checks confirmed plus/settings menus and table typing; the temporary text change was undone.

Further work should target additional browser engines, native clipboard and IME input, table cell merging, richer paste interoperability, and specific plugin adapters. Those are separate compatibility features, not implied by sharing Editor.js-shaped JSON.

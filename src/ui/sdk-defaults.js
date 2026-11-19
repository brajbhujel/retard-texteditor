import { makeBlock, escapeHTML as e, safeURL, embedURL } from '../core/model.js';
import { plainText } from '../core/sanitize.js';
import { icon } from './icons.js';
import { dialog, toast, formatOnClose } from './dialog.js';
import { linkDialog, colorDialog } from './formatting-dialogs.js';

function readFile(file) {
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('Choose a file smaller than 10 MB.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function fileData(file, type) {
  if (type === 'image' && !/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) throw new Error('Use a PNG, JPEG, GIF, WebP, or AVIF image.');
  if (type === 'audio' && !file.type.startsWith('audio/')) throw new Error('Choose an audio file.');
  if (type === 'video' && !['video/mp4', 'video/webm'].includes(file.type)) throw new Error('Choose an MP4 or WebM video.');
  let url = await readFile(file);
  if (type === 'attaches' && !safeURL(url, 'file')) url = url.replace(/^data:[^;]*;/, 'data:application/octet-stream;');
  if (['audio', 'video'].includes(type)) return { url };
  return { file: { url, name: file.name, size: file.size, extension: file.name.split('.').at(-1) }, ...(type === 'attaches' ? { title: file.name } : {}) };
}

async function insertFiles(editor, { files, index }) {
  try {
    const items = [];
    for (const file of files.slice(0, 10)) {
      const type = /^image\/(png|jpeg|gif|webp|avif)$/.test(file.type) ? 'image' : file.type.startsWith('audio/') ? 'audio' : ['video/mp4', 'video/webm'].includes(file.type) ? 'video' : 'attaches';
      items.push(makeBlock(type, await fileData(file, type)));
    }
    editor.transaction(() => editor.blocks.splice(Math.max(0, index), 0, ...items), { id: items.at(-1)?.id });
    toast(`${items.length} file${items.length === 1 ? '' : 's'} added`);
  } catch (error) {
    toast(error.message);
  }
}

function configureMedia(editor, block) {
  const type = block.type;
  const uploadable = ['image', 'attaches', 'audio', 'video'].includes(type);
  const url = block.data.file?.url || block.data.url || block.data.source || block.data.link || '';
  const label = { image: 'image', attaches: 'attachment', audio: 'audio', video: 'video', embed: 'video embed', linkTool: 'bookmark' }[type];
  const accept = { image: 'image/png,image/jpeg,image/gif,image/webp,image/avif', audio: 'audio/*', video: 'video/mp4,video/webm', attaches: '*' }[type];
  dialog({
    title: `Add ${label}`,
    description: type === 'embed' ? 'Paste a YouTube or Vimeo link.' : 'Bring a little more to your document.',
    body: `${uploadable ? `<label class="upload-area">${icon('upload', 25)}<strong>Choose a file</strong><span>Up to 10 MB · stored as a data URL</span><input type="file" name="file" accept="${accept}" aria-label="Upload ${label}"></label><div class="or-divider"><span>or use a link</span></div>` : ''}<label class="field-label">${type === 'embed' ? 'Video URL' : 'URL'}<input name="url" placeholder="https://…" value="${e(url.startsWith('data:') ? '' : url)}"></label>${type === 'image' ? `<label class="field-label">Alternative text<input name="alt" placeholder="Describe the image" value="${e(block.data.alt || '')}"></label>` : ''}${type === 'linkTool' ? `<label class="field-label">Title<input name="title" value="${e(plainText(block.data.meta.title || ''))}" placeholder="A useful link"></label><label class="field-label">Description<input name="description" value="${e(plainText(block.data.meta.description || ''))}" placeholder="Why is this worth keeping?"></label>` : ''}`,
    submit: 'Add to document',
    onSubmit: async data => {
      const file = data.get('file');
      let value = String(data.get('url') || '').trim();
      let patch;
      if (file instanceof File && file.size) patch = await fileData(file, type);
      else {
        if (!value && url.startsWith('data:')) value = url;
        if (type === 'embed') {
          const embed = embedURL(value);
          if (!embed) throw new Error('Use a valid YouTube or Vimeo video URL.');
          patch = { source: value, embed };
        } else {
          const safe = safeURL(value, type === 'image' ? 'image' : uploadable ? 'file' : 'link');
          if (!safe) throw new Error('Choose a file or enter a valid URL.');
          if (type === 'linkTool') patch = { link: safe, meta: { title: e(String(data.get('title') || safe)), description: e(String(data.get('description') || '')) } };
          else if (['audio', 'video'].includes(type)) patch = { url: safe };
          else patch = { file: { ...(block.data.file || {}), url: safe, name: block.data.file?.name || value.split('/').at(-1) || 'attachment' } };
        }
      }
      if (type === 'image') patch.alt = String(data.get('alt') || '');
      editor.update(block.id, patch);
    }
  });
}

/** Wire built-in link, colour, footnote, media, file, and notice dialogs. */
export function attachDefaults(editor) {
  editor.listen(editor, 'notice', event => toast(event.detail));
  editor.listen(editor, 'link', event => linkDialog(editor, event.detail));
  editor.listen(editor, 'color', event => colorDialog(editor, event.detail.kind || 'color'));
  editor.listen(editor, 'footnote', () => dialog({
    title: 'Add a footnote',
    description: 'A little extra context, without interrupting the thought.',
    body: '<label class="field-label">Note<textarea name="note" rows="3" required autofocus></textarea></label>',
    submit: 'Add footnote',
    onSubmit: (data, modal) => formatOnClose(modal, editor, 'footnote', String(data.get('note')))
  }));
  editor.listen(editor, 'footnotes', event => {
    const block = event.detail.block;
    dialog({
      title: 'Edit footnotes',
      body: block.tunes.footnotes.map((note, i) => `<label class="field-label">Note ${i + 1}<textarea name="note-${i}" rows="2">${e(plainText(note))}</textarea></label>`).join(''),
      onSubmit: data => editor.transaction(() => {
        editor.getBlock(block.id).tunes.footnotes = block.tunes.footnotes.map((_, i) => e(String(data.get(`note-${i}`))));
      })
    });
  });
  editor.listen(editor, 'configure', event => configureMedia(editor, event.detail.block));
  editor.listen(editor, 'files', event => insertFiles(editor, event.detail));
  return editor;
}

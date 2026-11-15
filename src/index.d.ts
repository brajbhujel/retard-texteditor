export type Alignment = 'left' | 'center' | 'right' | 'justify';
export interface ListItem { content: string; meta?: { checked?: boolean }; items?: ListItem[] }
export interface BlockDataMap {
  paragraph: { text: string };
  header: { text: string; level: 1 | 2 | 3 | 4 | 5 | 6 };
  list: { style: 'ordered' | 'unordered' | 'checklist'; items: ListItem[] };
  checklist: { items: { text: string; checked: boolean }[] };
  quote: { text: string; caption: string; alignment?: Alignment };
  warning: { title: string; message: string };
  delimiter: Record<string, never>;
  image: { file: { url: string; name?: string; size?: number }; caption: string; alt?: string; withBorder: boolean; withBackground: boolean; stretched: boolean };
  table: { withHeadings: boolean; content: string[][] };
  code: { code: string; language: string };
  raw: { html: string };
  embed: { source: string; embed?: string; caption: string };
  linkTool: { link: string; meta: { title: string; description: string } };
  attaches: { file: { url: string; name: string; size: number; extension?: string }; title: string };
  toggle: { title: string; text: string; open: boolean };
  audio: { url: string; caption: string };
  video: { url: string; caption: string };
}
export type BlockType = keyof BlockDataMap;
export interface Block<T extends string = string, D = Record<string, unknown>> { id: string; type: T; data: D; tunes: { alignment?: Alignment; footnotes?: string[]; [key: string]: unknown } }
export type BuiltInBlock = { [T in BlockType]: Block<T, BlockDataMap[T]> }[BlockType];
export interface OutputData { time?: number; version?: string; blocks: Block[]; title?: string }
export interface Tool<D = Record<string, unknown>> {
  title: string;
  icon?: string;
  description?: string;
  group?: string;
  render(data: D, readOnly: boolean, block: Block<string, D>): string;
  save?(element: HTMLElement, previous: D): D;
}
export interface EditorOptions {
  holder: string | HTMLElement;
  data?: OutputData;
  tools?: Record<string, Tool>;
  readOnly?: boolean;
  direction?: 'ltr' | 'rtl';
  placeholder?: string;
  onChange?(editor: RetardEditor, data: OutputData): void;
  onReady?(editor: RetardEditor): void;
}
export class RetardEditor extends EventTarget {
  constructor(options: EditorOptions);
  readonly isReady: Promise<RetardEditor>;
  readonly registry: ToolRegistry;
  readonly holder: HTMLElement;
  readonly blocks: Block[];
  readonly history: { canUndo: boolean; canRedo: boolean };
  readOnly: boolean;
  activeId: string | null;
  save(): Promise<OutputData>;
  getData(): OutputData;
  load(data: OutputData): Promise<void>;
  clear(): Promise<void>;
  insert<T extends BlockType>(type?: T, data?: Partial<BlockDataMap[T]>, index?: number): Block<T, BlockDataMap[T]>;
  insert(type: string, data?: Record<string, unknown>, index?: number): Block;
  update(id: string, data: Record<string, unknown>): void;
  delete(id: string): void;
  move(id: string, to: number): void;
  duplicate(id: string): void;
  convert(id: string, type: string, data?: Record<string, unknown>): void;
  getBlock(id?: string): Block | undefined;
  focus(id: string, field?: string, side?: 'start' | 'end'): void;
  setReadOnly(value: boolean): void;
  undo(): void;
  redo(): void;
  registerTool(name: string, tool: Tool): this;
  format(action: string, value?: string): void;
  destroy(): void;
}
export class ToolRegistry {
  constructor(tools?: Record<string, Tool>);
  register(name: string, tool: Tool): this;
  get(name: string): Tool | undefined;
  names(): string[];
  entries(): [string, Tool][];
}
export function makeBlock<T extends BlockType>(type?: T, data?: Partial<BlockDataMap[T]>, tunes?: Block['tunes']): Block<T, BlockDataMap[T]>;
export function normalizeDocument(input: unknown, allowedTypes?: string[]): OutputData;
export function statistics(blocks: Block[]): { words: number; characters: number; blocks: number; minutes: number };
export function sanitizeHTML(html: string): string;
export function toHTML(blocks: Block[], title?: string): string;
export function toMarkdown(blocks: Block[]): string;
export function fromMarkdown(markdown: string): Block[];
export function fromHTML(html: string): Block[];
export const VERSION: string;
export const builtins: Record<string, Tool>;
export function toolChoices(registry: ToolRegistry): Array<Tool & { type: string; data: Record<string, unknown>; shortcut: string }>;
export default RetardEditor;

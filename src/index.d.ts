import type {
  Blok,
  BlokConfig,
  OutputData,
  LooseOutputData,
  ToolConstructable,
  ToolSettings
} from '@bloklabs/core';

export type { OutputData, LooseOutputData, Blok, BlokConfig };

export type ToolsConfig = Record<string, ToolConstructable | ToolSettings>;

export interface EditorOptions {
  holder: string | HTMLElement;
  data?: OutputData | LooseOutputData | null;
  tools?: ToolsConfig;
  readOnly?: boolean | { hideControls?: boolean };
  placeholder?: string | false;
  autofocus?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  tokens?: Record<string, string>;
  onChange?(editor: RetardEditor, data: OutputData): void;
  onReady?(editor: RetardEditor): void;
  /** Extra BlokConfig fields merged last (collaboration, uploader, i18n, …). */
  blok?: Partial<BlokConfig>;
}

export declare const VERSION: string;
export declare const blokVersion: string;
export declare const RETARD_ACCENT: string;
export declare const RETARD_THEME_TOKENS: Record<string, string>;

export declare function createDefaultTools(extra?: ToolsConfig): ToolsConfig;

export declare const allTools: ToolsConfig;
export declare const defaultTools: ToolsConfig;
export declare const defaultInlineTools: ToolsConfig;
export declare const defaultBlockTools: Record<string, unknown>;

export declare class RetardEditor extends EventTarget {
  constructor(options: EditorOptions);
  readonly isReady: Promise<RetardEditor>;
  /** Underlying Blok instance. */
  readonly engine: Blok | null;
  readonly holder: HTMLElement;
  readonly blocks: OutputData['blocks'];
  readOnly: boolean;
  save(): Promise<OutputData>;
  getData(): OutputData;
  load(data: OutputData | LooseOutputData): Promise<void>;
  clear(): Promise<void>;
  focus(atEnd?: boolean): boolean;
  setReadOnly(value: boolean): void;
  destroy(): void;
}

export { Blok };
export default RetardEditor;

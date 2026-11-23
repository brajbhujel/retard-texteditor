declare module 'retard-texteditor' {
  export interface OutputData {
    time?: number;
    version?: string;
    blocks: unknown[];
    title?: string;
  }

  export interface EditorOptions {
    holder: string | HTMLElement;
    data?: OutputData | null;
    tools?: Record<string, unknown>;
    readOnly?: boolean | { hideControls?: boolean };
    placeholder?: string | false;
    autofocus?: boolean;
    theme?: 'light' | 'dark' | 'auto';
    tokens?: Record<string, string>;
    onChange?(editor: RetardEditor, data: OutputData): void;
    onReady?(editor: RetardEditor): void;
    blok?: Record<string, unknown>;
  }

  export class RetardEditor extends EventTarget {
    constructor(options: EditorOptions);
    readonly isReady: Promise<RetardEditor>;
    readonly holder: HTMLElement;
    readonly blocks: unknown[];
    readOnly: boolean;
    save(): Promise<OutputData>;
    getData(): OutputData;
    load(data: OutputData): Promise<void>;
    clear(): Promise<void>;
    focus(atEnd?: boolean): boolean;
    setReadOnly(value: boolean): void;
    destroy(): void;
  }

  export const VERSION: string;
  export default RetardEditor;
}

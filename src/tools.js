import { allTools } from '@bloklabs/core/full';
import {
  Table,
  Image,
  File,
  Audio,
  Video,
  Divider,
  Spacer,
  Embed,
  Bookmark,
  TableOfContents,
  ColumnList,
  Column,
  Tabs,
  TabTool
} from '@bloklabs/core/tools';

/**
 * Batteries-included tool map: Blok `allTools` plus common Notion-like blocks.
 * Pass `tools` through RetardEditor options to trim or extend.
 */
export function createDefaultTools(extra = {}) {
  return {
    ...allTools,
    table: { class: Table },
    image: { class: Image },
    file: { class: File },
    audio: { class: Audio },
    video: { class: Video },
    divider: { class: Divider },
    spacer: { class: Spacer },
    embed: { class: Embed },
    bookmark: { class: Bookmark },
    table_of_contents: { class: TableOfContents },
    column_list: { class: ColumnList },
    column: { class: Column },
    tabs: { class: Tabs },
    tab: { class: TabTool },
    ...extra
  };
}

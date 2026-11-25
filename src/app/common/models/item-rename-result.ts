/**
 * Response shape of POST /api/items/{path}/rename (Items.rename_item()).
 * A different parent segment in new_path triggers a move — same endpoint,
 * same response shape, no separate "move" concept on the wire.
 */
export interface ItemRenameResult {
  result: string;
  new_path: string;
  rewritten_references: string[];
  failed_references: [string, string][]; // [item_path, error]
}

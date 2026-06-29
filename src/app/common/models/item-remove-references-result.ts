/**
 * Response shape of POST /api/items/{path}/remove_references (Items.remove_references()).
 * Backend serializes its internal (path, [...]) tuples as plain JSON arrays, not objects.
 */
export interface ItemRemoveReferencesResult {
  removed: [string, string[]][]; // [item_path, [attribute_names]]
  skipped_ambiguous: [string, string, string][]; // [item_path, attribute_name, value]
}

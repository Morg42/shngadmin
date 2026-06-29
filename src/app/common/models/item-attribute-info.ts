/**
 * Catalog entry for one item attribute (core sh.yaml attribute or plugin-defined
 * attribute), as served by the backend's items/attributes and plugins/info endpoints.
 * description is keyed by language but not every attribute has both translations.
 */
export interface ItemAttributeInfo {
  type: string;
  valid_list?: string[];
  description?: { de?: string; en?: string };
}

/**
 * A self-reference whose target wasn't part of the copy (either
 * include_children=False left a descendant behind, or the reference
 * pointed outside the copied item's subtree entirely) — left pointing at
 * the original instead of being rewritten to a path that wouldn't exist.
 */
export interface ItemReferenceLeftPointingAtOriginal {
  item: string;
  attribute: string;
  reference: string;
}

/**
 * A relative (leading-dot) reference that may no longer be correct after
 * the copy — never rewritten (its target is inherently tied to tree
 * position), just flagged. `reason` is 'not_copied' for a reference whose
 * original target was a descendant left behind by include_children=False
 * (resolved_new_target absent — the target is unambiguously gone), or
 * 'target_may_differ' for one pointing outside the copied subtree entirely,
 * where the same relative text now resolves to something else.
 */
export interface ItemRelativeReferenceFlagged {
  item: string;
  attribute: string;
  reference: string;
  resolved_original_target: string;
  resolved_new_target?: string;
  reason: 'not_copied' | 'target_may_differ';
}

/**
 * Response shape of POST /api/items/{path}/copy (Items.copy_item()).
 */
export interface ItemCopyResult {
  result: string;
  new_path: string;
  left_pointing_at_original: ItemReferenceLeftPointingAtOriginal[];
  relative_references_flagged: ItemRelativeReferenceFlagged[];
}

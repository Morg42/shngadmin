/**
 * One match found by the backend's reference check (Items.find_references()) when
 * scanning other items' eval/on_change/on_update/trigger/hysteresis_input attributes
 * for mentions of an item path that's about to be deleted.
 *
 * unambiguous: true if the deleted item is the ONLY item the matched text depends
 * on (backend resolves sh.<path> refs against the live tree, not a guess) — a hint
 * for which matches are safe to clean up, not a guarantee. Review aid, not a
 * structural fact for trigger/hysteresis_input (always true there by construction)
 * vs eval/on_change/on_update (free-form Python, resolved textually).
 */
export interface ItemReference {
  item: string;
  attribute: string;
  value: string;
  unambiguous: boolean;
}

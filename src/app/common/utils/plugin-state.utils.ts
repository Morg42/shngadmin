/** Plugin states (metadata `state`) whose plugins are removed with the next minor or major release. */
export const REMOVAL_STATES = ['deprecated', 'defunct'] as const;

/** A plugin state that marks a plugin for removal. */
export type RemovalState = (typeof REMOVAL_STATES)[number];

/** Returns the removal state of a plugin state (case-insensitive), or null if the plugin is not to be removed. */
export function removalState(state: string | null | undefined): RemovalState | null {
  const normalized = (state ?? '').toLowerCase();
  return (REMOVAL_STATES as readonly string[]).includes(normalized)
    ? (normalized as RemovalState)
    : null;
}

/** Translation key of the short label of a removal state ('PLUGIN.DEPRECATED', 'PLUGIN.DEFUNCT'). */
export function removalStateLabelKey(state: RemovalState): string {
  return `PLUGIN.${state.toUpperCase()}`;
}

/** Translation key of the explanation of a removal state ('PLUGIN.DEPRECATED_TEXT', 'PLUGIN.DEFUNCT_TEXT'). */
export function removalStateTextKey(state: RemovalState): string {
  return `PLUGIN.${state.toUpperCase()}_TEXT`;
}

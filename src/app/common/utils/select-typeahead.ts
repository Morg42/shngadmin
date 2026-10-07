/** Focusable element of a non-editable PrimeNG select (an editable one uses a real text input). */
const SELECT_COMBOBOX = 'p-select [role="combobox"]:not(input)';

/**
 * Stops printable keystrokes on a non-editable `p-select` from reaching the
 * browser's default handling.
 *
 * The select's focusable element is a `<span>`, so Firefox-family browsers
 * with "Search for text when you start typing" open their find bar on every
 * unhandled keypress there, instead of the select's own type-ahead (jump to
 * the next option starting with the typed text) being the only reaction.
 * PrimeNG's keydown handler runs on the span before this document-level
 * listener, so its type-ahead is unaffected; only the browser default is
 * cancelled. Ctrl/Meta/Alt chords stay untouched.
 *
 * @returns a function that removes the listener
 */
export function suppressBrowserTypeaheadOnSelect(doc: Document): () => void {
  const onKeydown = (event: KeyboardEvent): void => {
    const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (isPrintable && event.target instanceof Element && event.target.matches(SELECT_COMBOBOX)) {
      event.preventDefault();
    }
  };
  doc.addEventListener('keydown', onKeydown);
  return () => doc.removeEventListener('keydown', onKeydown);
}

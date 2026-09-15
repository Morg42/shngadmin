import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AutoComplete } from 'primeng/autocomplete';
import { ButtonDirective } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ItemsApiService } from '../../common/services/items-api.service';
import {
  InputKind,
  resolveInputKind,
  resolveSelectOptions,
  SelectOption,
} from '../../common/utils/input-type.utils';

/**
 * Type-aware input control for an item attribute's value — driven by the
 * attribute catalog's declared type (GET /api/items/attributes), not the
 * item's own value type (those are two distinct vocabularies, see
 * ~/.claude/handoff/ for the design history; lib/metadata.py's
 * _test_valuetype() is the backend's authoritative type-check this mirrors).
 *
 * Shared by the create-item and edit-item dialogs — built once so both get
 * the same controls instead of every attribute being a single freeform
 * text field.
 */
@Component({
  selector: 'app-attribute-value-input',
  templateUrl: './attribute-value-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AutoComplete,
    ButtonDirective,
    FormsModule,
    InputNumber,
    InputText,
    Select,
    ToggleSwitch,
  ],
})
export class AttributeValueInputComponent {
  private itemsApi = inject(ItemsApiService);
  private readonly destroyRef = inject(DestroyRef);

  /** Declared attribute type, e.g. 'bool', 'str', 'list(num)', 'dict' — the
   *  subtype in parens (if any) is not used for control selection in this
   *  v1 (list/dict rows are always plain text); only the base type before
   *  '(' matters. */
  readonly type = input('');
  readonly validList = input<string[]>();
  readonly validMin = input<number>();
  readonly validMax = input<number>();
  readonly value = input<unknown>();
  readonly valueChange = output<unknown>();

  /** Derived from value() whenever the parent passes a new one, but locally
   *  mutable by the row editors below (add/remove/update a row) without a
   *  round-trip through the parent — a linkedSignal recomputes its default
   *  from value() but keeps a .set()/.update() override until value() itself
   *  changes again. */
  readonly listRows = linkedSignal<string[]>(() =>
    AttributeValueInputComponent.toListRows(this.value()),
  );
  readonly dictRows = linkedSignal<{ key: string; value: string }[]>(() =>
    AttributeValueInputComponent.toDictRows(this.value()),
  );
  readonly itemPathSuggestions = signal<string[]>([]);
  readonly filteredItemPaths = signal<string[]>([]);

  get baseType(): string {
    return this.type().split('(')[0];
  }

  /** Options for the 'select' input kind - the attribute's own valid_list,
   *  or a synthesized true/false pair for a bool that doesn't define one. */
  get selectOptions(): SelectOption[] | undefined {
    return resolveSelectOptions(this.type(), this.validList());
  }

  get inputKind(): InputKind | 'autocomplete' {
    // Every attribute row here has its own delete button, so removing the
    // row - not clearing the value in place - is how "not set, use
    // default" is represented; a toggle is fine, there's no in-widget
    // unset state to lose.
    const resolved = resolveInputKind(this.type(), (this.validList()?.length ?? 0) > 0, 'toggle');
    return resolved === 'text' && this.baseType === 'str' ? 'autocomplete' : resolved;
  }

  /** Lazily loaded on first use (only the str/autocomplete control needs
   *  it), not on every component instance up front. */
  searchItemPaths(event: { query: string }) {
    if (this.itemPathSuggestions().length === 0) {
      this.itemsApi
        .getItemList()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((paths) => {
          this.itemPathSuggestions.set(paths as string[]);
          this.filteredItemPaths.set(this.filterItemPaths(event.query));
        });
      return;
    }
    this.filteredItemPaths.set(this.filterItemPaths(event.query));
  }

  private filterItemPaths(query: string): string[] {
    const q = query.toLowerCase();
    return this.itemPathSuggestions().filter((p) => p.toLowerCase().includes(q));
  }

  emitValue(value: unknown) {
    this.valueChange.emit(value);
  }

  addListRow() {
    this.listRows.update((rows) => [...rows, '']);
    this.emitValue(this.listRows());
  }

  removeListRow(index: number) {
    this.listRows.update((rows) => rows.filter((_, i) => i !== index));
    this.emitValue(this.listRows());
  }

  updateListRow(index: number, rowValue: string) {
    this.listRows.update((rows) => rows.map((v, i) => (i === index ? rowValue : v)));
    this.emitValue(this.listRows());
  }

  addDictRow() {
    this.dictRows.update((rows) => [...rows, { key: '', value: '' }]);
    this.emitDict();
  }

  removeDictRow(index: number) {
    this.dictRows.update((rows) => rows.filter((_, i) => i !== index));
    this.emitDict();
  }

  updateDictRowKey(index: number, key: string) {
    this.dictRows.update((rows) => rows.map((r, i) => (i === index ? { ...r, key } : r)));
    this.emitDict();
  }

  updateDictRowValue(index: number, value: string) {
    this.dictRows.update((rows) => rows.map((r, i) => (i === index ? { ...r, value } : r)));
    this.emitDict();
  }

  private emitDict() {
    const dict: Record<string, string> = {};
    for (const row of this.dictRows()) {
      if (row.key.trim() !== '') {
        dict[row.key] = row.value;
      }
    }
    this.emitValue(dict);
  }

  /** Coerces whatever is currently stored into row form for the list
   *  editor — already an array: used as-is. A legacy freeform string (from
   *  before this control existed, or a still-unconverted plugin default):
   *  parsed as JSON if it looks like one, otherwise treated as a single
   *  row, so opening the editor never silently drops existing content. */
  private static toListRows(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = AttributeValueInputComponent.tryParseJson(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
      return [value];
    }
    return [];
  }

  private static toDictRows(value: unknown): { key: string; value: string }[] {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value as Record<string, unknown>).map(([key, v]) => ({
        key,
        value: String(v),
      }));
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = AttributeValueInputComponent.tryParseJson(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, unknown>).map(([key, v]) => ({
          key,
          value: String(v),
        }));
      }
    }
    return [];
  }

  private static tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
}

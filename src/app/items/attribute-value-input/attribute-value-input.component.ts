import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { AutoComplete } from 'primeng/autocomplete';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ItemsApiService } from '../../common/services/items-api.service';

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
  imports: [AutoComplete, FaIconComponent, FormsModule, InputText, Select, ToggleSwitch],
})
export class AttributeValueInputComponent implements OnChanges {
  private itemsApi = inject(ItemsApiService);

  /** Declared attribute type, e.g. 'bool', 'str', 'list(num)', 'dict' — the
   *  subtype in parens (if any) is not used for control selection in this
   *  v1 (list/dict rows are always plain text); only the base type before
   *  '(' matters. */
  @Input() type = '';
  @Input() validList?: string[];
  @Input() value: unknown;
  @Output() valueChange = new EventEmitter<unknown>();

  faPlus = faPlus;
  faTrashAlt = faTrashAlt;

  listRows: string[] = [];
  dictRows: { key: string; value: string }[] = [];
  itemPathSuggestions: string[] = [];
  filteredItemPaths: string[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      this.listRows = AttributeValueInputComponent.toListRows(this.value);
      this.dictRows = AttributeValueInputComponent.toDictRows(this.value);
    }
  }

  get baseType(): string {
    return this.type.split('(')[0];
  }

  get inputKind():
    | 'select'
    | 'toggle'
    | 'list'
    | 'dict'
    | 'password'
    | 'autocomplete'
    | 'number'
    | 'text' {
    if ((this.validList?.length ?? 0) > 0) return 'select';
    switch (this.baseType) {
      case 'bool':
        return 'toggle';
      case 'list':
        return 'list';
      case 'dict':
        return 'dict';
      case 'password':
        return 'password';
      case 'int':
      case 'float':
      case 'num':
      case 'scene':
        return 'number';
      case 'str':
        return 'autocomplete';
      default:
        // foo, ip, ipv4, ipv6, mac, knx_ga — no dedicated control, plain text
        return 'text';
    }
  }

  /** Lazily loaded on first use (only the str/autocomplete control needs
   *  it), not on every component instance up front. */
  searchItemPaths(event: { query: string }) {
    if (this.itemPathSuggestions.length === 0) {
      this.itemsApi.getItemList().subscribe((paths) => {
        this.itemPathSuggestions = paths as string[];
        this.filteredItemPaths = this.filterItemPaths(event.query);
      });
      return;
    }
    this.filteredItemPaths = this.filterItemPaths(event.query);
  }

  private filterItemPaths(query: string): string[] {
    const q = query.toLowerCase();
    return this.itemPathSuggestions.filter((p) => p.toLowerCase().includes(q));
  }

  emitValue(value: unknown) {
    this.valueChange.emit(value);
  }

  addListRow() {
    this.listRows = [...this.listRows, ''];
    this.emitValue(this.listRows);
  }

  removeListRow(index: number) {
    this.listRows = this.listRows.filter((_, i) => i !== index);
    this.emitValue(this.listRows);
  }

  updateListRow(index: number, rowValue: string) {
    this.listRows = this.listRows.map((v, i) => (i === index ? rowValue : v));
    this.emitValue(this.listRows);
  }

  addDictRow() {
    this.dictRows = [...this.dictRows, { key: '', value: '' }];
    this.emitDict();
  }

  removeDictRow(index: number) {
    this.dictRows = this.dictRows.filter((_, i) => i !== index);
    this.emitDict();
  }

  updateDictRowKey(index: number, key: string) {
    this.dictRows = this.dictRows.map((r, i) => (i === index ? { ...r, key } : r));
    this.emitDict();
  }

  updateDictRowValue(index: number, value: string) {
    this.dictRows = this.dictRows.map((r, i) => (i === index ? { ...r, value } : r));
    this.emitDict();
  }

  private emitDict() {
    const dict: Record<string, string> = {};
    for (const row of this.dictRows) {
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

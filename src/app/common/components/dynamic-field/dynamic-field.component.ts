import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ConfigParameter, TableColumn } from '../../models/interfaces';

@Component({
  selector: 'app-dynamic-field',
  templateUrl: './dynamic-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Bind, Select, FormsModule, InputText],
})
export class DynamicFieldComponent {
  /** row is written into via ngModel (row[col.field]) and is otherwise the
   *  parent table's own object — under OnPush, a parent that changes a row's
   *  value programmatically (not via this component's own template events)
   *  must publish a NEW row reference or this field won't pick it up. */
  readonly row = input.required<ConfigParameter>();
  readonly col = input.required<TableColumn>();
  readonly changed = output<void>();

  readonly NUM_TYPES = ['int', 'num', 'float', 'scene', 'hide-int'];

  /** p-select's internal label rendering falls back via `placeholder() ||
   *  'p-emptylabel'` when nothing is selected - a falsy-but-real default
   *  (boolean false, number 0) was silently swallowed by that `||` and
   *  rendered as nothing at all, not as the string "false"/"0". Always
   *  returning a string sidesteps the falsy check entirely. */
  get placeholder(): string | undefined {
    const def = this.row().default;
    return def === undefined || def === null ? undefined : String(def);
  }

  get validMin(): string | number | null {
    return (this.row().valid_min as string | number | null) ?? null;
  }

  get validMax(): string | number | null {
    return (this.row().valid_max as string | number | null) ?? null;
  }

  get inputKind(): string {
    const { type, gui_type, valid_list } = this.row();
    if ((valid_list?.length ?? 0) > 0) return 'select';
    if (type && this.NUM_TYPES.includes(type)) return 'number';
    if (type === 'hide-str') return 'password';
    if (type === 'bool' || type === 'password') return 'none';
    if (gui_type === 'readonly') return 'text-readonly';
    if (gui_type === 'wide_str') return 'text-wide';
    return 'text';
  }

  onChanged(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.changed.emit();
  }
}

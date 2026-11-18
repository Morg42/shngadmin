import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { DecimalInputDirective } from '../../directives/decimal-input.directive';
import { ConfigParameter, TableColumn } from '../../models/interfaces';
import { ServicesApiService } from '../../services/services-api.service';
import {
  InputKind,
  resolveInputKind,
  resolveSelectOptions,
  SelectOption,
} from '../../utils/input-type.utils';

/** Parameter types holding a secret: masked, with a button that fills in a generated random secret. */
const SECRET_TYPES: readonly string[] = ['password', 'hide-str'];

@Component({
  selector: 'app-dynamic-field',
  templateUrl: './dynamic-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Select,
    FormsModule,
    InputText,
    InputNumber,
    Password,
    ButtonDirective,
    Tooltip,
    TranslatePipe,
    DecimalInputDirective,
  ],
})
export class DynamicFieldComponent {
  private readonly servicesApi = inject(ServicesApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  /** row is written into via ngModel (row[col.field]) and is otherwise the
   *  parent table's own object — under OnPush, a parent that changes a row's
   *  value programmatically (not via this component's own template events)
   *  must publish a NEW row reference or this field won't pick it up. */
  readonly row = input.required<ConfigParameter>();
  readonly col = input.required<TableColumn>();
  /** false for secret rows that have their own flow (hashed passwords), hiding the generate button. */
  readonly allowGenerate = input(true);
  readonly changed = output<void>();

  /** p-select's internal label rendering falls back via `placeholder() ||
   *  'p-emptylabel'` when nothing is selected - a falsy-but-real default
   *  (boolean false, number 0) was silently swallowed by that `||` and
   *  rendered as nothing at all, not as the string "false"/"0". Always
   *  returning a string sidesteps the falsy check entirely. */
  get placeholder(): string | undefined {
    const def = this.row().default;
    return def === undefined || def === null ? undefined : String(def);
  }

  get validMin(): number | null {
    const v = this.row().valid_min;
    return v === undefined || v === null ? null : Number(v);
  }

  get validMax(): number | null {
    const v = this.row().valid_max;
    return v === undefined || v === null ? null : Number(v);
  }

  /** Options for the 'select' input kind - the row's own valid_list, or a
   *  synthesized true/false pair for a bool that doesn't define one. */
  get selectOptions(): SelectOption[] | undefined {
    const { type, valid_list } = this.row();
    return resolveSelectOptions(type, valid_list);
  }

  get inputKind(): InputKind | 'text-readonly' | 'text-wide' {
    const { type, gui_type, valid_list } = this.row();
    // hide-int/hide-str: shngadmin-only GUI conventions, not part of shng's
    // own value-type vocabulary, so resolveInputKind() doesn't know them.
    if (type === 'hide-int') return 'number';
    if (type === 'hide-str') return 'password';

    // None of this table's rows (plugin parameters, module settings, logic
    // parameters) can be deleted, so a dropdown-with-clear is the only way
    // to represent "not set, follow the default" for a bool here.
    const resolved = resolveInputKind(type, (valid_list?.length ?? 0) > 0, 'clearable-select');
    // This table has no list/dict row editor (unlike attribute-value-input) -
    // fall back to plain text, same as before the shared resolver existed,
    // rather than rendering nothing for these types.
    const kind = resolved === 'list' || resolved === 'dict' ? 'text' : resolved;
    if (kind === 'text') {
      if (gui_type === 'readonly') return 'text-readonly';
      if (gui_type === 'wide_str') return 'text-wide';
    }
    return kind;
  }

  /** True if the row holds a secret the generate button may fill in. */
  get canGenerate(): boolean {
    return this.allowGenerate() && SECRET_TYPES.includes(this.row().type ?? '');
  }

  /** Replace the row's value by a random secret from the backend; a failed request leaves it unchanged. */
  generateSecret(): void {
    this.servicesApi
      .generateSecret()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((secret) => {
        if (secret === null) return;
        this.row()[this.col().field] = secret;
        this.cdr.markForCheck();
        this.onChanged();
      });
  }

  onChanged(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.changed.emit();
  }
}

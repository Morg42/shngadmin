import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faList, faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { AutoComplete } from 'primeng/autocomplete';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { ItemDetails } from '../../../common/models/item-details';
import { AttributeCatalogService } from '../../../common/services/attribute-catalog.service';
import { ItemsApiService } from '../../../common/services/items-api.service';
import { AttributeBrowserComponent } from '../../attribute-browser/attribute-browser.component';
import { AttributeValueInputComponent } from '../../attribute-value-input/attribute-value-input.component';

/** Extracted from ItemTreeComponent's edit-item flow. Same shape as
 *  CreateItemDialogComponent (B4), but reactive rather than an imperative
 *  open() - editItemType/editItemAttributes/editItemError are linkedSignals
 *  rebuilt from itemDetails() whenever the dialog (re)opens, matching
 *  PluginParameterDialogComponent's established pattern (reading visible()
 *  purely for dependency-tracking, to force a fresh rebuild on every open
 *  even when reopening the same item without an intervening reload -
 *  discarding any unsaved local edits exactly like the original's
 *  unconditional per-click rebuild did). */
@Component({
  selector: 'app-edit-item-dialog',
  templateUrl: './edit-item-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AttributeBrowserComponent,
    AttributeValueInputComponent,
    AutoComplete,
    Dialog,
    FaIconComponent,
    FormsModule,
    Select,
    TranslatePipe,
  ],
})
export class EditItemDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly itemsApi = inject(ItemsApiService);
  private readonly translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);
  readonly attributeCatalogService = inject(AttributeCatalogService);

  private readonly editAttrNameInputs = viewChildren('editAttrNameInput', { read: ElementRef });

  faList = faList;
  faPlus = faPlus;
  faTrashAlt = faTrashAlt;

  readonly itemDetails = input<ItemDetails | undefined>(undefined);
  readonly visible = model(false);
  readonly saved = output<string>();

  filteredAttributeNames: string[] = [];

  /** The parent triggers this via a ViewChild call (from the "⋮" menu's
   *  command callback, not a template event) rather than just writing to
   *  the bound editItem_display signal directly - PrimeNG's popup Menu
   *  invokes command() in a context where a plain parent-side signal write
   *  didn't reliably propagate down into this component's visible input on
   *  the first click (needed two clicks to actually open). Setting visible
   *  from inside this component itself, like CreateItemDialogComponent's
   *  open() (B4) and AttributeBrowserComponent's open() (B3), sidesteps
   *  that entirely. */
  open() {
    this.visible.set(true);
  }

  /** Pre-populates from itemDetails.editable_config — the complete current
   *  attribute set (core + generic), safe to PATCH straight back. NOT from
   *  itemDetails.config, which is item.conf only (generic/plugin attrs) and
   *  silently omits core attributes like type/eval/trigger entirely — using
   *  it here would reset them to their defaults on save. */
  readonly editItemType = linkedSignal<string>(() => {
    this.visible();
    const details = this.itemDetails();
    const config = details?.editable_config ?? {};
    return (config['type'] as string) ?? details?.type ?? 'str';
  });

  readonly editItemAttributes = linkedSignal<{ key: string; value: unknown }[]>(() => {
    this.visible();
    const config = this.itemDetails()?.editable_config ?? {};
    return Object.entries(config)
      .filter(([key]) => !AttributeCatalogService.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(key))
      .map(([key, value]) => ({ key, value }));
  });

  readonly editItemError = linkedSignal<string>(() => {
    this.visible();
    return '';
  });

  addEditAttributeRow() {
    this.editItemAttributes.update((rows) => [...rows, { key: '', value: '' }]);
    setTimeout(() =>
      this.editAttrNameInputs()?.at(-1)!?.nativeElement.querySelector('input')?.focus(),
    );
  }

  removeEditAttributeRow(index: number) {
    this.editItemAttributes.update((rows) => rows.filter((_, i) => i !== index));
  }

  /** currentRow is the row being typed into - excluded from the "already
   *  used elsewhere" check, otherwise its own live-typed value (e.g. typing
   *  "cache" updates attr.key to "cache" as you type) would hide the exact
   *  match from its own suggestions, showing only longer/different names. */
  searchAttributeNames(event: { query: string }, currentRow?: { key: string; value: unknown }) {
    const q = event.query.toLowerCase();
    const used = this.editItemAttributes()
      .filter((a) => a !== currentRow)
      .map((a) => a.key);
    this.filteredAttributeNames = Object.keys(
      this.attributeCatalogService.attributeCatalog(),
    ).filter(
      (a) =>
        a.toLowerCase().includes(q) &&
        !used.includes(a) &&
        !AttributeCatalogService.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(a),
    );
  }

  submitEditItem() {
    const path = this.itemDetails()?.path;
    if (!path) return;

    const config: Record<string, unknown> = { type: this.editItemType() };
    for (const attr of this.editItemAttributes()) {
      const key = attr.key.trim();
      if (key !== '') {
        config[key] = attr.value;
      }
    }

    this.editItemError.set('');
    this.itemsApi
      .editItem(path, config)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.visible.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.EDIT_SUCCESS_TITLE'),
            detail: path,
            life: 5000,
          });
          this.saved.emit(path);
        },
        error: (err: HttpErrorResponse) => {
          this.editItemError.set(
            (err.error?.error as string | undefined) ?? this.translate.instant('ITEMS.EDIT_FAILED'),
          );
        },
      });
  }
}

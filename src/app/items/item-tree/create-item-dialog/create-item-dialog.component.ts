import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
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
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { AttributeCatalogService } from '../../../common/services/attribute-catalog.service';
import { FilesApiService } from '../../../common/services/files-api.service';
import { ItemsApiService } from '../../../common/services/items-api.service';
import { AttributeBrowserComponent } from '../../attribute-browser/attribute-browser.component';
import { AttributeValueInputComponent } from '../../attribute-value-input/attribute-value-input.component';
import { computeMissingAncestors } from '../item-tree-path.utils';

/** Extracted from ItemTreeComponent's create-item flow. Self-sufficient: fetches
 *  its own newItemKnownPaths/itemFilenames on open() rather than the parent
 *  passing them down, mirroring AttributeCatalogService/AttributeBrowserComponent's
 *  self-fetch convention established earlier in this refactor. */
@Component({
  selector: 'app-create-item-dialog',
  templateUrl: './create-item-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AttributeBrowserComponent,
    AttributeValueInputComponent,
    AutoComplete,
    Dialog,
    FaIconComponent,
    FormsModule,
    InputText,
    Select,
    ToggleSwitch,
    Tooltip,
    TranslatePipe,
  ],
})
export class CreateItemDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly itemsApi = inject(ItemsApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);
  readonly attributeCatalogService = inject(AttributeCatalogService);

  private readonly attrNameInputs = viewChildren('attrNameInput', { read: ElementRef });

  faList = faList;
  faPlus = faPlus;
  faTrashAlt = faTrashAlt;

  readonly visible = model(false);
  /** Default parent/filename for a newly opened dialog - read once, at
   *  open() time, not bound reactively into the form fields themselves
   *  (both stay freely editable plain fields afterwards, same as before
   *  this was a separate component). */
  readonly parentPath = input('');
  readonly parentFilename = input('');
  readonly created = output<string>();

  newItemParent = '';
  newItemName = '';
  newItemType = 'str';
  newItemPersist = true;
  newItemFilename = '';
  newItemAttributes: { key: string; value: unknown }[] = [];
  filteredAttributeNames: string[] = [];
  readonly itemFilenames = signal<string[]>([]);
  readonly filteredItemFiles = signal<string[]>([]);
  readonly newItemError = signal('');

  private readonly newItemKnownPaths = signal(new Set<string>());

  get newItemFullPath(): string {
    return this.newItemParent ? this.newItemParent + '.' + this.newItemName : this.newItemName;
  }

  /** No dot in the full path: identical to the original single-segment
   *  check. A dot present (parent, name, or both contributing extra
   *  levels — e.g. typing a multi-level path directly into Name): every
   *  dot-separated segment of the whole path must independently be a
   *  legal item name, since each one is either an existing item (already
   *  valid by construction) or gets auto-created as a new one. */
  get newItemNameValid(): boolean {
    return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/.test(this.newItemFullPath);
  }

  /** Ancestors of newItemFullPath that don't exist yet — e.g. typing a
   *  parent path several levels deep in one go, mkdir -p style. Computed
   *  against a snapshot fetched once when the dialog opens (see open());
   *  a stale snapshot just means a chain-creation step below fails with a
   *  normal collision error, same "no rollback, no special-case" tradeoff
   *  as rename's identical mechanism. */
  get newItemMissingAncestors(): string[] {
    return computeMissingAncestors(this.newItemFullPath, this.newItemKnownPaths());
  }

  open() {
    this.newItemParent = this.parentPath();
    this.newItemName = '';
    this.newItemType = 'str';
    this.newItemPersist = true;
    // Overwritable default: the parent's own file, so the new item stays next
    // to related config. Empty (top-level, no parent) falls through to the
    // backend's own default (sh._created_items_file) when persisting.
    const parentFilename = this.parentFilename();
    this.newItemFilename = parentFilename && parentFilename !== 'None' ? parentFilename : '';
    this.newItemAttributes = [];
    this.newItemError.set('');
    this.visible.set(true);

    this.itemsApi
      .getItemList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paths) => {
        this.newItemKnownPaths.set(new Set(paths as string[]));
      });

    if (this.itemFilenames().length === 0) {
      this.filesApi
        .getfileList('items')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((response) => {
          this.itemFilenames.set(
            (response as string[])
              .filter((f) => f.toLowerCase().endsWith('.yaml'))
              .map((f) => f.slice(0, -5)),
          );
        });
    }
  }

  addAttributeRow() {
    this.newItemAttributes = [...this.newItemAttributes, { key: '', value: '' }];
    // QueryList only reflects the new row's input after this view update
    // finishes rendering, so focus has to happen on the next macrotask.
    setTimeout(() => this.attrNameInputs()?.at(-1)!?.nativeElement.querySelector('input')?.focus());
  }

  removeAttributeRow(index: number) {
    this.newItemAttributes = this.newItemAttributes.filter((_, i) => i !== index);
  }

  /** currentRow is the row being typed into - excluded from the "already
   *  used elsewhere" check, otherwise its own live-typed value (e.g. typing
   *  "cache" updates attr.key to "cache" as you type) would hide the exact
   *  match from its own suggestions, showing only longer/different names.
   *  Own copy, not shared with EditItemDialogComponent's identical logic —
   *  each dialog is self-sufficient now that neither goes through
   *  ItemTreeComponent's old activeAttributeRows dispatch anymore. */
  searchAttributeNames(event: { query: string }, currentRow?: { key: string; value: unknown }) {
    const q = event.query.toLowerCase();
    const used = this.newItemAttributes.filter((a) => a !== currentRow).map((a) => a.key);
    this.filteredAttributeNames = Object.keys(
      this.attributeCatalogService.attributeCatalog(),
    ).filter(
      (a) =>
        a.toLowerCase().includes(q) &&
        !used.includes(a) &&
        !AttributeCatalogService.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(a),
    );
  }

  searchItemFiles(event: { query: string }) {
    const q = event.query.toLowerCase();
    this.filteredItemFiles.set(this.itemFilenames().filter((f) => f.toLowerCase().includes(q)));
  }

  /** Filenames are stored/matched without extension (see itemFilenames above
   *  and lib/shyaml.py's yamlfile docstring) — typing "orbtest.yaml" or
   *  "orbtest.yml" instead of picking the extension-less suggestion used to
   *  make the backend treat it as a different file from the existing
   *  "orbtest", silently overwriting it (its own existence check appends
   *  ".yaml" unconditionally, unlike the load/save helpers). Stripped on
   *  blur so the field always shows what will actually be used. */
  stripFilenameExtension() {
    this.newItemFilename = this.newItemFilename.replace(/\.ya?ml$/i, '');
  }

  submitNewItem() {
    if (!this.newItemNameValid) return;
    this.stripFilenameExtension();

    const config: Record<string, unknown> = { type: this.newItemType };
    for (const attr of this.newItemAttributes) {
      const key = attr.key.trim();
      if (key !== '') {
        config[key] = attr.value;
      }
    }

    const createdPath = this.newItemFullPath;
    this.newItemError.set('');
    // Missing ancestors are auto-created server-side in the same request
    // (create_missing_parents) — one call, and any collision along the
    // chain (which can't be reliably checked client-side, it depends on
    // live Python object introspection) comes back as a normal error on
    // this same request instead of needing separate per-step handling.
    this.createLeafItem(createdPath, config, this.newItemMissingAncestors.length > 0);
  }

  private createLeafItem(
    createdPath: string,
    config: Record<string, unknown>,
    createMissingParents = false,
  ) {
    this.itemsApi
      .createItem(
        createdPath,
        config,
        this.newItemPersist,
        this.newItemFilename || undefined,
        createMissingParents,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.visible.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.CREATE_SUCCESS_TITLE'),
            detail: createdPath,
            life: 5000,
          });
          this.created.emit(createdPath);
        },
        error: (err: HttpErrorResponse) => {
          this.newItemError.set(
            (err.error?.error as string | undefined) ??
              this.translate.instant('ITEMS.CREATE_FAILED'),
          );
        },
      });
  }
}

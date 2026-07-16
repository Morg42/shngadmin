import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService, TreeNode } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ItemDetails } from '../../../common/models/item-details';
import { ItemReference } from '../../../common/models/item-reference';
import { ItemsApiService } from '../../../common/services/items-api.service';

/** Extracted from ItemTreeComponent's delete flow. deleteItemHasFile/
 *  deleteItemHasChildren/deleteItemDescendantCount/countDescendants moved
 *  here wholesale rather than duplicated - confirmed via grep before the
 *  move that nothing outside the delete dialog itself (markup or
 *  open()/confirmDeleteItem()) reads them, unlike the plan's original
 *  assumption. */
@Component({
  selector: 'app-delete-item-dialog',
  templateUrl: './delete-item-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, FormsModule, ToggleSwitch, TranslatePipe],
})
export class DeleteItemDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly itemsApi = inject(ItemsApiService);
  private readonly translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);

  readonly itemDetails = input<ItemDetails | undefined>(undefined);
  /** The tree node for whatever's currently shown in the details pane —
   *  same node this dialog operates on — so its own children array
   *  (already loaded with the rest of the tree, no extra fetch needed) is
   *  a reliable source for "does this item have sub-items". */
  readonly selectedFile = input<TreeNode | undefined>(undefined);
  readonly visible = model(false);
  readonly deleted = output<void>();

  readonly deleteItemReferences = signal<ItemReference[] | null>(null);
  readonly deleteItemReferencesFailed = signal(false);
  readonly deleteItemError = signal('');
  deleteItemPersist = true;
  deleteItemCleanupReferences = true;
  readonly deleteItemCleanupFailed = signal(false);
  /** Separate, unchecked-by-default acknowledgement — deleting sub-items
   *  loses real, possibly substantial existing config, unlike the
   *  auto-created (always-empty) ancestors on the create-item side, so
   *  this needs an explicit opt-in rather than just a button-label
   *  change. */
  deleteItemConfirmChildren = false;

  /** Backend returns the source filename without extension (since shng dyn-item);
   *  display it consistently with how filenames are shown elsewhere in the app
   *  (e.g. item-configuration). Duplicated from ItemTreeComponent, which still
   *  needs its own copy for the detail panel's own filename display - both are
   *  one-line pure getters over itemDetails().filename, not worth a cross-
   *  component call for. */
  get definedInFilename(): string {
    const filename = this.itemDetails()?.filename ?? '';
    return filename && !filename.endsWith('.yaml') ? filename + '.yaml' : filename;
  }

  /** False for purely runtime items (never persisted to a file) — the backend
   *  returns the literal string 'None' for those. The persist toggle is
   *  meaningless for these (nothing to remove from a file), so it gets
   *  disabled rather than offering a choice that has no effect either way. */
  get deleteItemHasFile(): boolean {
    const filename = this.itemDetails()?.filename;
    return !!filename && filename !== 'None';
  }

  get deleteItemHasChildren(): boolean {
    return (this.selectedFile()?.children?.length ?? 0) > 0;
  }

  /** Total sub-items across the whole subtree, not just direct children —
   *  a chain of auto-created ancestors (e.g. from create-item's mkdir -p
   *  path) can nest several levels deep, and the delete confirmation must
   *  reflect everything that's actually about to be removed, including
   *  deeper descendants that may carry real config (unlike the empty
   *  intermediate levels above them). */
  get deleteItemDescendantCount(): number {
    const node = this.selectedFile();
    return node ? DeleteItemDialogComponent.countDescendants(node) : 0;
  }

  private static countDescendants(node: TreeNode): number {
    const children = node.children ?? [];
    return children.reduce(
      (sum, child) => sum + 1 + DeleteItemDialogComponent.countDescendants(child),
      0,
    );
  }

  /** trigger/hysteresis_input matches are always unambiguous by construction
   *  (a bare-path attribute either matches or it doesn't — no partial
   *  dependency is possible), so "ambiguous" only ever occurs in the
   *  eval-family. Sorted ambiguous-first, then eval-family-before-structural
   *  within the unambiguous group, so the rows needing real human attention
   *  ("can't clean, will break") lead, the ones merely losing an expression
   *  ("can clean, but copy it first") come next, and purely mechanical ones
   *  trail at the bottom. */
  private static readonly STRUCTURAL_REFERENCE_ATTRIBUTES = ['trigger', 'hysteresis_input'];

  private sortReferencesForReview(refs: ItemReference[]): ItemReference[] {
    const rank = (ref: ItemReference): [number, number, string] => [
      ref.unambiguous ? 1 : 0,
      DeleteItemDialogComponent.STRUCTURAL_REFERENCE_ATTRIBUTES.includes(ref.attribute) ? 1 : 0,
      ref.item,
    ];
    return [...refs].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      return ra[0] - rb[0] || ra[1] - rb[1] || ra[2].localeCompare(rb[2]);
    });
  }

  open() {
    const path = this.itemDetails()?.path;
    if (!path) return;
    this.deleteItemError.set('');
    this.deleteItemReferences.set(null);
    this.deleteItemReferencesFailed.set(false);
    this.deleteItemCleanupReferences = true;
    this.deleteItemCleanupFailed.set(false);
    this.deleteItemPersist = this.deleteItemHasFile;
    this.deleteItemConfirmChildren = false;
    this.visible.set(true);

    this.itemsApi
      .getItemReferences(path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((refs) => {
        if (refs === null) {
          this.deleteItemReferencesFailed.set(true);
        } else {
          this.deleteItemReferences.set(this.sortReferencesForReview(refs));
        }
      });
  }

  confirmDeleteItem() {
    const path = this.itemDetails()?.path;
    if (!path) return;
    this.deleteItemCleanupFailed.set(false);

    const hasCleanableReferences = (this.deleteItemReferences() ?? []).some(
      (ref) => ref.unambiguous,
    );
    if (this.deleteItemCleanupReferences && hasCleanableReferences) {
      this.itemsApi
        .removeReferences(path)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.performDelete(path),
          error: () => {
            // A hard failure of the cleanup call itself (network/500) — not
            // the normal best-effort outcome (skipped_ambiguous), which is
            // already known from the review table above and isn't an error.
            // Abort rather than delete an item whose references we just
            // failed to clean up, leaving the user able to retry or
            // uncheck cleanup and delete without it.
            this.deleteItemCleanupFailed.set(true);
          },
        });
    } else {
      this.performDelete(path);
    }
  }

  private performDelete(path: string) {
    this.itemsApi
      .deleteItem(
        path,
        this.deleteItemPersist,
        this.deleteItemHasChildren && this.deleteItemConfirmChildren,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.visible.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.DELETE_SUCCESS_TITLE'),
            detail: path,
            life: 5000,
          });
          this.deleted.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.deleteItemError.set(
            (err.error?.error as string | undefined) ??
              this.translate.instant('ITEMS.DELETE_FAILED'),
          );
        },
      });
  }
}

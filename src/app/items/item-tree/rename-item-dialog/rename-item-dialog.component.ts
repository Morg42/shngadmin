import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tree, TreeNodeSelectEvent } from 'primeng/tree';
import {
  ItemReferenceLeftPointingAtOriginal,
  ItemRelativeReferenceFlagged,
} from '../../../common/models/item-copy-result';
import { ItemsApiService } from '../../../common/services/items-api.service';
import { computeMissingAncestors, findAndExpandNodeByPath } from '../item-tree-path.utils';

/** Extracted from ItemTreeComponent's rename/copy flow. Bundles the three
 *  satellite dialogs (missing-parents confirm, failed-references detail,
 *  copy-references detail) internally rather than as further extractions -
 *  traced to be rename/copy-only, never reached from create (see
 *  createItemChain()'s doc comment). The two reference-detail dialogs stay
 *  re-openable from ItemTreeComponent's own item-detail header (a badge
 *  next to the "more actions" button, positioned outside this component's
 *  own dialogs) via a ViewChild - failedReferencesCount()/
 *  copyReferencesTotalCount()/showFailedReferences()/showCopyReferences()
 *  are this component's public surface for that. */
@Component({
  selector: 'app-rename-item-dialog',
  templateUrl: './rename-item-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, FormsModule, InputText, ProgressSpinner, ToggleSwitch, TranslatePipe, Tree],
})
export class RenameItemDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly itemsApi = inject(ItemsApiService);
  private readonly translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);

  readonly itemPath = input('');
  readonly itemFilename = input('');
  /** Fed the parent's filteredTree() reactively - the tree-picker data for
   *  choosing a new parent. */
  readonly treeNodes = input<{}[]>([]);
  /** Set by whichever menu action opened the dialog (Rename vs Copy) -
   *  read fresh by open()'s callers (they set it, then call open()), and
   *  reactively by the template/renameItemNewPathValid/renameItemCopyDisabled
   *  afterward. No in-dialog switch to flip between the two. */
  readonly isCopy = input(false);
  readonly visible = model(false);
  readonly renamed = output<string>();
  readonly copied = output<string>();

  /** Single field, doing double duty: a bare name ("switch") renames in
   *  place under whatever parent is currently selected in the tree below;
   *  a dotted path ("a.b.switch") is used as the complete new path as-is,
   *  for power users who'd rather type than click through the tree.
   *  Clicking a tree node rewrites just this string's parent-prefix,
   *  keeping whatever leaf segment was already typed — the two input
   *  methods cooperate on the same field rather than fighting over it. */
  renameItemNewPathInput = '';
  renameItemSelectedParentNode: TreeNode | undefined;
  /** Only meaningful while isCopy() is true — whether the copy includes
   *  the item's child items (the whole subtree, the default) or just the
   *  item's own attributes. Passed straight through to
   *  Items.copy_item()'s include_children parameter. */
  renameItemCopyIncludeChildren = true;
  readonly renameItemError = signal('');
  /** True while a rename/create-missing-parent request is in flight —
   *  renaming can take a while if a plugin pauses to reconnect to real
   *  hardware/network, and with no other feedback users have been known
   *  to assume it's stuck and try to cancel. */
  readonly renameItemSubmitting = signal(false);

  /** Set after a successful rename/move that left some references
   *  un-rewritten — the detail dialog auto-opens right away (see
   *  attemptRenameItem()) rather than waiting behind a badge no one's
   *  guaranteed to click. Dismissing that dialog clears this too (see
   *  onRenameFailedReferencesVisibleChange()) — relying on "the next
   *  rename" to clear a stale notice isn't realistic if the user has
   *  nothing else to rename any time soon. */
  readonly renameItemLastFailedReferences = signal<[string, string][]>([]);
  renameFailedReferencesDetail_display = false;
  readonly failedReferencesCount = computed(() => this.renameItemLastFailedReferences().length);

  /** Bound to the dialog's (visibleChange) (X button/ESC/outside click) AND
   *  called directly by the footer Close button — either way, closing the
   *  dialog is treated as "acknowledged", clearing the underlying list so
   *  the badge doesn't linger with no dismiss action of its own. */
  onRenameFailedReferencesVisibleChange(visible: boolean) {
    this.renameFailedReferencesDetail_display = visible;
    if (!visible) {
      this.renameItemLastFailedReferences.set([]);
    }
  }

  showFailedReferences() {
    this.renameFailedReferencesDetail_display = true;
  }

  /** Set after a copy that left some self-references pointing at the
   *  original (include_children=False left their target behind, or they
   *  pointed outside the copied subtree entirely) or flagged a relative
   *  reference that may no longer be correct. Same auto-open/dismiss-to-clear
   *  treatment as renameItemLastFailedReferences, see attemptCopyItem() /
   *  onCopyReferencesVisibleChange(). */
  readonly copyItemLeftPointingAtOriginal = signal<ItemReferenceLeftPointingAtOriginal[]>([]);
  readonly copyItemRelativeReferencesFlagged = signal<ItemRelativeReferenceFlagged[]>([]);
  copyReferencesDetail_display = false;

  readonly copyReferencesTotalCount = computed(
    () =>
      this.copyItemLeftPointingAtOriginal().length +
      this.copyItemRelativeReferencesFlagged().length,
  );

  /** Same treatment as onRenameFailedReferencesVisibleChange() — bound to
   *  (visibleChange) and called directly by the footer Close button. */
  onCopyReferencesVisibleChange(visible: boolean) {
    this.copyReferencesDetail_display = visible;
    if (!visible) {
      this.copyItemLeftPointingAtOriginal.set([]);
      this.copyItemRelativeReferencesFlagged.set([]);
    }
  }

  showCopyReferences() {
    this.copyReferencesDetail_display = true;
  }

  /** Synthetic node prepended to the rename dialog's tree picker — the
   *  real tree has no clickable "top level" node of its own. path: ''
   *  flows straight through selectRenameParent()'s normal logic. */
  private static readonly TOP_LEVEL_TREE_NODE = {
    label: '',
    path: '',
    icon: 'pi pi-home',
    selectable: true,
  };

  get renameItemParentTreeNodes(): {}[] {
    return [
      {
        ...RenameItemDialogComponent.TOP_LEVEL_TREE_NODE,
        label: this.translate.instant('ITEMS.TOP_LEVEL'),
      },
      ...(this.treeNodes() ?? []),
    ];
  }

  /** Set when a rename attempt fails specifically because the target's
   *  parent doesn't exist yet — offered to the user as "create these
   *  first?" rather than just a dead-end error. */
  readonly renameItemMissingAncestors = signal<string[]>([]);
  readonly renameItemConfirmCreateParents_display = signal(false);

  get renameItemNewPath(): string {
    return this.renameItemNewPathInput.trim();
  }

  /** Validates every dot-separated segment, not just the whole string —
   *  catches a stray double-dot or trailing dot from manual typing the
   *  same way an invalid bare leaf name would be caught. */
  get renameItemNewPathValid(): boolean {
    const path = this.renameItemNewPath;
    if (path === '') return false;
    if (this.isCopy() && (path === this.itemPath() || this.renameItemCopyDisabled)) return false;
    return path.split('.').every((segment) => /^[A-Za-z][A-Za-z0-9_]*$/.test(segment));
  }

  /** Only a persisted item's complete config can be reconstructed with its
   *  children intact (see Items.copy_item()'s docstring on the backend) — a
   *  runtime-only item has no such helper, so copying it is disabled here
   *  rather than failing after a round-trip to the server. */
  get renameItemCopyDisabled(): boolean {
    const filename = this.itemFilename();
    return !filename || filename === 'None';
  }

  /** Starts at "rename in place" — the input is pre-filled with the item's
   *  complete CURRENT path (not just its leaf name), so the preview
   *  already shows the unchanged path and the parent prefix is genuinely
   *  there to edit, not just implied by the tree selection below. The
   *  tree picker lets the user change the parent too, turning it into a
   *  move (same endpoint either way, see ItemsApiService.renameItem()).
   *  Pre-selects and expands down to the item's current parent in the
   *  picker, so it's clear where it is now, not just where it's going.
   *  Called via ViewChild from the "⋮" menu's Rename/Copy commands (which
   *  set isCopy first) rather than relying on the parent writing to
   *  visible directly — see EditItemDialogComponent.open()'s doc comment
   *  for why. */
  open() {
    const path = this.itemPath();
    if (!path) return;
    const lastDot = path.lastIndexOf('.');
    this.renameItemNewPathInput = path;
    const currentParentPath = lastDot === -1 ? '' : path.slice(0, lastDot);
    this.renameItemSelectedParentNode =
      currentParentPath === ''
        ? undefined
        : (findAndExpandNodeByPath(
            this.treeNodes() as (TreeNode & { path: string })[],
            currentParentPath,
          ) as TreeNode | undefined);
    this.renameItemError.set('');
    this.renameItemMissingAncestors.set([]);
    this.renameItemSubmitting.set(false);
    this.renameItemCopyIncludeChildren = true;
    this.visible.set(true);
  }

  /** Rewrites just the parent-prefix of renameItemNewPathInput, keeping
   *  whatever leaf segment was already typed — so clicking the tree and
   *  typing a name cooperate on the same field instead of one overwriting
   *  the other. */
  selectRenameParent(event: TreeNodeSelectEvent) {
    const node = event.node as TreeNode & { path: string };
    const current = this.renameItemNewPathInput;
    const lastDot = current.lastIndexOf('.');
    const leaf = lastDot === -1 ? current : current.slice(lastDot + 1);
    this.renameItemNewPathInput = node.path ? node.path + '.' + leaf : leaf;
  }

  submitRenameItem() {
    if (!this.renameItemNewPathValid) return;
    this.renameItemMissingAncestors.set([]);
    if (this.isCopy()) {
      this.attemptCopyItem();
    } else {
      this.attemptRenameItem();
    }
  }

  private attemptRenameItem() {
    const oldPath = this.itemPath();
    const newPath = this.renameItemNewPath;
    this.renameItemError.set('');
    this.renameItemSubmitting.set(true);
    this.itemsApi
      .renameItem(oldPath, newPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.renameItemSubmitting.set(false);
          this.visible.set(false);
          this.renameItemLastFailedReferences.set(result.failed_references ?? []);
          this.renameFailedReferencesDetail_display = this.failedReferencesCount() > 0;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.RENAME_SUCCESS_TITLE'),
            detail: `${oldPath} -> ${newPath}`,
            life: 5000,
          });
          this.renamed.emit(newPath);
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.error as string | undefined;
          const missingParent = RenameItemDialogComponent.MISSING_PARENT_PATTERN.exec(
            message ?? '',
          );
          if (missingParent) {
            this.checkMissingAncestors(newPath);
            return;
          }
          this.renameItemSubmitting.set(false);
          if (RenameItemDialogComponent.CYCLE_PATTERN.test(message ?? '')) {
            this.renameItemError.set(this.translate.instant('ITEMS.RENAME_CYCLE'));
          } else {
            this.renameItemError.set(message ?? this.translate.instant('ITEMS.RENAME_FAILED'));
          }
        },
      });
  }

  /** Mirrors attemptRenameItem() but calls copyItem() and leaves the
   *  source item untouched — same missing-ancestor recovery path, since
   *  Items.copy_item() reuses create_item()'s own "parent not found"
   *  error. */
  private attemptCopyItem() {
    const oldPath = this.itemPath();
    const newPath = this.renameItemNewPath;
    this.renameItemError.set('');
    this.renameItemSubmitting.set(true);
    this.itemsApi
      .copyItem(oldPath, newPath, undefined, this.renameItemCopyIncludeChildren)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.renameItemSubmitting.set(false);
          this.visible.set(false);
          this.copyItemLeftPointingAtOriginal.set(result.left_pointing_at_original ?? []);
          this.copyItemRelativeReferencesFlagged.set(result.relative_references_flagged ?? []);
          this.copyReferencesDetail_display = this.copyReferencesTotalCount() > 0;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.COPY_SUCCESS_TITLE'),
            detail: `${oldPath} -> ${newPath}`,
            life: 5000,
          });
          this.copied.emit(newPath);
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.error as string | undefined;
          const missingParent = RenameItemDialogComponent.MISSING_PARENT_PATTERN.exec(
            message ?? '',
          );
          if (missingParent) {
            this.checkMissingAncestors(newPath);
            return;
          }
          this.renameItemSubmitting.set(false);
          this.renameItemError.set(message ?? this.translate.instant('ITEMS.COPY_FAILED'));
        },
      });
  }

  /** Matches Items.rename_item()'s exact "parent '...' not found" message —
   *  only used to recognize this specific failure, not to extract anything
   *  from it (the chain of missing ancestors is computed separately, since
   *  the backend only reports the immediate parent, not deeper ones). */
  private static readonly MISSING_PARENT_PATTERN = /parent '[^']+' not found/;

  /** Matches Items.rename_item()'s "cannot become a child of itself" message. */
  private static readonly CYCLE_PATTERN = /cannot become a child of itself/;

  private checkMissingAncestors(newPath: string) {
    this.itemsApi
      .getItemList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paths) => {
        this.renameItemMissingAncestors.set(
          computeMissingAncestors(newPath, new Set(paths as string[])),
        );
        this.renameItemSubmitting.set(false);
        this.renameItemConfirmCreateParents_display.set(true);
      });
  }

  /** Structural-only items (no explicit type — Item.__init__ defaults an
   *  untyped item to type 'foo' itself, see lib/item/item.py) matching the
   *  moved item's own persistence — created in the same file it's already
   *  in, so the whole chain stays consistent once the rename actually
   *  moves it underneath them (see
   *  ~/.claude/handoff/shng-rename-item-design.md's "which file" priority
   *  rule on the backend side). */
  confirmCreateMissingParents() {
    this.renameItemConfirmCreateParents_display.set(false);
    this.renameItemSubmitting.set(true);
    const filename = this.itemFilename();
    const persist = !!filename && filename !== 'None';
    const isCopy = this.isCopy();
    this.createItemChain(
      [...this.renameItemMissingAncestors()],
      persist,
      persist ? filename : undefined,
      () => (isCopy ? this.attemptCopyItem() : this.attemptRenameItem()),
      (err: HttpErrorResponse) => {
        this.renameItemSubmitting.set(false);
        this.renameItemError.set(
          (err.error?.error as string | undefined) ??
            this.translate.instant(isCopy ? 'ITEMS.COPY_FAILED' : 'ITEMS.RENAME_FAILED'),
        );
      },
    );
  }

  /** Creates each path in *remaining*, in order (shallow to deep), as an
   *  empty structural item — rename/copy's missing-ancestor recovery only.
   *  No rollback on a mid-chain failure: whatever was already created stays
   *  (they're valid, harmless structural items either way — same as if a
   *  user had created them by hand ahead of time). */
  private createItemChain(
    remaining: string[],
    persist: boolean,
    filename: string | undefined,
    onDone: () => void,
    onError: (err: HttpErrorResponse) => void,
  ) {
    if (remaining.length === 0) {
      onDone();
      return;
    }
    const [next, ...rest] = remaining;
    this.itemsApi
      .createItem(next, {}, persist, filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.createItemChain(rest, persist, filename, onDone, onError),
        error: onError,
      });
  }
}

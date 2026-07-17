import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { translateTestingModule } from '../../../../testing/test-helpers';
import { ItemsApiService } from '../../../common/services/items-api.service';
import { RenameItemDialogComponent } from './rename-item-dialog.component';

describe('RenameItemDialogComponent', () => {
  let component: RenameItemDialogComponent;
  let fixture: ComponentFixture<RenameItemDialogComponent>;
  let mockItemsApi: {
    renameItem: jest.Mock;
    copyItem: jest.Mock;
    getItemList: jest.Mock;
    createItem: jest.Mock;
  };

  beforeEach(async () => {
    mockItemsApi = {
      renameItem: jest
        .fn()
        .mockReturnValue(
          of({ result: 'ok', new_path: 'a.new', rewritten_references: [], failed_references: [] }),
        ),
      copyItem: jest.fn().mockReturnValue(
        of({
          result: 'ok',
          new_path: 'a.new',
          left_pointing_at_original: [],
          relative_references_flagged: [],
        }),
      ),
      getItemList: jest.fn().mockReturnValue(of([])),
      createItem: jest.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [RenameItemDialogComponent, translateTestingModule],
      providers: [{ provide: ItemsApiService, useValue: mockItemsApi }, MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(RenameItemDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('itemPath', 'a.old');
    fixture.componentRef.setInput('itemFilename', 'items_file');
  });

  // ---------------------------------------------------------------------
  // open()
  // ---------------------------------------------------------------------

  it('open() pre-fills the input with the current path and makes the dialog visible', () => {
    component.open();

    expect(component.renameItemNewPathInput).toBe('a.old');
    expect(component.visible()).toBe(true);
    expect(component.renameItemCopyIncludeChildren).toBe(true);
  });

  it('open() is a no-op without an itemPath', () => {
    fixture.componentRef.setInput('itemPath', '');

    component.open();

    expect(component.visible()).toBe(false);
  });

  // ---------------------------------------------------------------------
  // renameItemParentTreeNodes
  // ---------------------------------------------------------------------

  // Regression tests for the same click-eating pattern fixed in
  // item-tree.component.ts's itemActionsMenuItems: a getter re-evaluated on
  // every read would return a new array/objects each time, and PrimeNG's
  // p-tree (bound to this via [value]) renders its nodes with no trackBy,
  // so it would tear down and rebuild the parent-picker tree on every
  // unrelated read while the rename/copy dialog sat open. Two reads with
  // nothing in between would pass trivially for any computed() regardless
  // of correctness, so these drive an unrelated signal write (mimicking
  // the kind of unrelated state change that originally triggered the bug)
  // and a real translate.use() language switch instead.
  it('renameItemParentTreeNodes stays referentially stable across an unrelated signal write', () => {
    const first = component.renameItemParentTreeNodes();

    component.renameItemSubmitting.set(true);
    const second = component.renameItemParentTreeNodes();

    expect(second).toBe(first);
  });

  it('renameItemParentTreeNodes rebuilds with a new reference when the language actually changes', () => {
    const translate = TestBed.inject(TranslateService);
    translate.use('de');
    const first = component.renameItemParentTreeNodes();

    translate.use('en');
    const second = component.renameItemParentTreeNodes();

    expect(second).not.toBe(first);
  });

  it('renameItemParentTreeNodes recomputes when the treeNodes input changes', () => {
    const before = component.renameItemParentTreeNodes();

    fixture.componentRef.setInput('treeNodes', [{ label: 'a', path: 'a' }]);
    const after = component.renameItemParentTreeNodes();

    expect(after).not.toBe(before);
    expect(after.map((n) => (n as { path: string }).path)).toEqual(['', 'a']);
  });

  // ---------------------------------------------------------------------
  // Rename happy path
  // ---------------------------------------------------------------------

  it('submitRenameItem() renames, closes the dialog and emits renamed with the new path', () => {
    component.open();
    component.renameItemNewPathInput = 'a.newname';
    const renamedSpy = jest.fn();
    component.renamed.subscribe(renamedSpy);

    component.submitRenameItem();

    expect(mockItemsApi.renameItem).toHaveBeenCalledWith('a.old', 'a.newname');
    expect(component.visible()).toBe(false);
    expect(renamedSpy).toHaveBeenCalledWith('a.newname');
  });

  it('submitRenameItem() is a no-op when the new path is invalid', () => {
    component.open();
    component.renameItemNewPathInput = '1invalid';

    component.submitRenameItem();

    expect(mockItemsApi.renameItem).not.toHaveBeenCalled();
  });

  it('submitRenameItem() surfaces a plain error and keeps the dialog open', () => {
    mockItemsApi.renameItem.mockReturnValue(
      throwError(() => ({ error: { error: 'name collision' } })),
    );
    component.open();
    component.renameItemNewPathInput = 'a.newname';

    component.submitRenameItem();

    expect(component.renameItemError()).toBe('name collision');
    expect(component.visible()).toBe(true);
  });

  it('submitRenameItem() shows a specific message when the target would be a child of itself', () => {
    mockItemsApi.renameItem.mockReturnValue(
      throwError(() => ({ error: { error: 'cannot become a child of itself' } })),
    );
    component.open();
    component.renameItemNewPathInput = 'a.old.nested';

    component.submitRenameItem();

    expect(component.renameItemError()).toBe('ITEMS.RENAME_CYCLE');
  });

  it('a successful rename that left failed references auto-opens the failed-references detail', () => {
    mockItemsApi.renameItem.mockReturnValue(
      of({
        result: 'ok',
        new_path: 'a.newname',
        rewritten_references: [],
        failed_references: [['b.ref', 'boom']],
      }),
    );
    component.open();
    component.renameItemNewPathInput = 'a.newname';

    component.submitRenameItem();

    expect(component.renameFailedReferencesDetail_display).toBe(true);
    expect(component.failedReferencesCount()).toBe(1);
  });

  it('onRenameFailedReferencesVisibleChange(false) dismisses and clears the failed-references list', () => {
    component.renameItemLastFailedReferences.set([['b.ref', 'boom']]);
    component.renameFailedReferencesDetail_display = true;

    component.onRenameFailedReferencesVisibleChange(false);

    expect(component.renameFailedReferencesDetail_display).toBe(false);
    expect(component.failedReferencesCount()).toBe(0);
  });

  // ---------------------------------------------------------------------
  // Missing-ancestors confirm flow
  // ---------------------------------------------------------------------

  it('a "parent not found" error triggers the missing-ancestors confirm dialog', () => {
    mockItemsApi.renameItem.mockReturnValue(
      throwError(() => ({ error: { error: "parent 'a.b' not found" } })),
    );
    mockItemsApi.getItemList.mockReturnValue(of(['a']));
    component.open();
    component.renameItemNewPathInput = 'a.b.c.newname';

    component.submitRenameItem();

    expect(component.renameItemConfirmCreateParents_display()).toBe(true);
    expect(component.renameItemMissingAncestors()).toEqual(['a.b', 'a.b.c']);
    expect(component.renameItemSubmitting()).toBe(false);
  });

  it('confirmCreateMissingParents() creates each missing ancestor then retries the rename', () => {
    component.open();
    component.renameItemNewPathInput = 'a.b.c.newname';
    component.renameItemMissingAncestors.set(['a.b', 'a.b.c']);
    component.renameItemConfirmCreateParents_display.set(true);

    component.confirmCreateMissingParents();

    expect(mockItemsApi.createItem).toHaveBeenNthCalledWith(1, 'a.b', {}, true, 'items_file');
    expect(mockItemsApi.createItem).toHaveBeenNthCalledWith(2, 'a.b.c', {}, true, 'items_file');
    expect(mockItemsApi.renameItem).toHaveBeenCalledWith('a.old', 'a.b.c.newname');
    expect(component.renameItemConfirmCreateParents_display()).toBe(false);
  });

  it('confirmCreateMissingParents() creates ancestors as runtime-only when the moved item itself is not persisted', () => {
    fixture.componentRef.setInput('itemFilename', 'None');
    component.open();
    component.renameItemNewPathInput = 'a.b.newname';
    component.renameItemMissingAncestors.set(['a.b']);

    component.confirmCreateMissingParents();

    expect(mockItemsApi.createItem).toHaveBeenCalledWith('a.b', {}, false, undefined);
  });

  // ---------------------------------------------------------------------
  // Copy, with/without children
  // ---------------------------------------------------------------------

  it('submitRenameItem() calls copyItem() with includeChildren when isCopy is set', () => {
    fixture.componentRef.setInput('isCopy', true);
    component.open();
    component.renameItemNewPathInput = 'a.copy';
    component.renameItemCopyIncludeChildren = true;
    const copiedSpy = jest.fn();
    component.copied.subscribe(copiedSpy);

    component.submitRenameItem();

    expect(mockItemsApi.copyItem).toHaveBeenCalledWith('a.old', 'a.copy', undefined, true);
    expect(copiedSpy).toHaveBeenCalledWith('a.copy');
  });

  it('submitRenameItem() calls copyItem() with includeChildren false when the toggle is off', () => {
    fixture.componentRef.setInput('isCopy', true);
    component.open();
    component.renameItemNewPathInput = 'a.copy';
    component.renameItemCopyIncludeChildren = false;

    component.submitRenameItem();

    expect(mockItemsApi.copyItem).toHaveBeenCalledWith('a.old', 'a.copy', undefined, false);
  });

  it('renameItemNewPathValid is false when copying onto the same path, or when the source is not persisted', () => {
    fixture.componentRef.setInput('isCopy', true);
    fixture.componentRef.setInput('itemFilename', 'None');
    component.open();
    component.renameItemNewPathInput = 'a.copy';
    expect(component.renameItemNewPathValid).toBe(false); // renameItemCopyDisabled (no file)

    fixture.componentRef.setInput('itemFilename', 'items_file');
    component.renameItemNewPathInput = 'a.old';
    expect(component.renameItemNewPathValid).toBe(false); // same as source path
  });

  // ---------------------------------------------------------------------
  // Copy reference-detail dialog on partial failure
  // ---------------------------------------------------------------------

  it('a copy that leaves references behind auto-opens the copy-references detail', () => {
    mockItemsApi.copyItem.mockReturnValue(
      of({
        result: 'ok',
        new_path: 'a.copy',
        left_pointing_at_original: [{ item: 'a.copy.x', attribute: 'eval', reference: '..y' }],
        relative_references_flagged: [],
      }),
    );
    fixture.componentRef.setInput('isCopy', true);
    component.open();
    component.renameItemNewPathInput = 'a.copy';

    component.submitRenameItem();

    expect(component.copyReferencesDetail_display).toBe(true);
    expect(component.copyReferencesTotalCount()).toBe(1);
  });

  it('onCopyReferencesVisibleChange(false) dismisses and clears both reference lists', () => {
    component.copyItemLeftPointingAtOriginal.set([
      { item: 'x', attribute: 'eval', reference: '..y' },
    ]);
    component.copyItemRelativeReferencesFlagged.set([
      {
        item: 'x',
        attribute: 'eval',
        reference: '..y',
        resolved_original_target: 'a',
        reason: 'not_copied',
      },
    ]);
    component.copyReferencesDetail_display = true;

    component.onCopyReferencesVisibleChange(false);

    expect(component.copyReferencesDetail_display).toBe(false);
    expect(component.copyReferencesTotalCount()).toBe(0);
  });

  it('a "parent not found" error during copy also triggers the missing-ancestors confirm flow', () => {
    mockItemsApi.copyItem.mockReturnValue(
      throwError(() => ({ error: { error: "parent 'a.b' not found" } })),
    );
    mockItemsApi.getItemList.mockReturnValue(of([]));
    fixture.componentRef.setInput('isCopy', true);
    component.open();
    component.renameItemNewPathInput = 'a.b.copy';

    component.submitRenameItem();

    expect(component.renameItemConfirmCreateParents_display()).toBe(true);
  });
});

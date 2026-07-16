import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { translateTestingModule } from '../../../../testing/test-helpers';
import { ItemDetails } from '../../../common/models/item-details';
import { ItemsApiService } from '../../../common/services/items-api.service';
import { DeleteItemDialogComponent } from './delete-item-dialog.component';

describe('DeleteItemDialogComponent', () => {
  let component: DeleteItemDialogComponent;
  let fixture: ComponentFixture<DeleteItemDialogComponent>;
  let mockItemsApi: {
    getItemReferences: jest.Mock;
    removeReferences: jest.Mock;
    deleteItem: jest.Mock;
  };

  beforeEach(async () => {
    mockItemsApi = {
      getItemReferences: jest.fn().mockReturnValue(of([])),
      removeReferences: jest.fn().mockReturnValue(of({ removed: [], skipped_ambiguous: [] })),
      deleteItem: jest.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [DeleteItemDialogComponent, translateTestingModule],
      providers: [{ provide: ItemsApiService, useValue: mockItemsApi }, MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteItemDialogComponent);
    component = fixture.componentInstance;
  });

  // ---------------------------------------------------------------------
  // deleteItemHasFile
  // ---------------------------------------------------------------------

  it('deleteItemHasFile is false for runtime-only items (backend returns filename "None")', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'None' } as ItemDetails);
    expect(component.deleteItemHasFile).toBe(false);
  });

  it('deleteItemHasFile is true when the item has a real source file', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    expect(component.deleteItemHasFile).toBe(true);
  });

  // ---------------------------------------------------------------------
  // deleteItemHasChildren / deleteItemDescendantCount
  // ---------------------------------------------------------------------

  it('deleteItemHasChildren is false when the selected tree node has no children, or is not set', () => {
    fixture.componentRef.setInput('selectedFile', { children: [] });
    expect(component.deleteItemHasChildren).toBe(false);

    fixture.componentRef.setInput('selectedFile', undefined);
    expect(component.deleteItemHasChildren).toBe(false);
  });

  it('deleteItemHasChildren is true when the selected tree node has children', () => {
    fixture.componentRef.setInput('selectedFile', { children: [{ label: 'child' }] });
    expect(component.deleteItemHasChildren).toBe(true);
  });

  it('deleteItemDescendantCount is 0 when selectedFile is not set', () => {
    fixture.componentRef.setInput('selectedFile', undefined);
    expect(component.deleteItemDescendantCount).toBe(0);
  });

  it('deleteItemDescendantCount counts the whole subtree, not just direct children', () => {
    // a chain like create-item's mkdir -p auto-created ancestors:
    // abd -> cef -> ghi -> jkl -> mno (4 descendants below abd)
    fixture.componentRef.setInput('selectedFile', {
      label: 'abd',
      children: [
        {
          label: 'cef',
          children: [
            {
              label: 'ghi',
              children: [{ label: 'jkl', children: [{ label: 'mno', children: [] }] }],
            },
          ],
        },
      ],
    });

    expect(component.deleteItemDescendantCount).toBe(4);
  });

  it('deleteItemDescendantCount sums across multiple branches', () => {
    fixture.componentRef.setInput('selectedFile', {
      label: 'root',
      children: [
        { label: 'a', children: [{ label: 'a.a', children: [] }] },
        { label: 'b', children: [] },
      ],
    });

    expect(component.deleteItemDescendantCount).toBe(3);
  });

  // ---------------------------------------------------------------------
  // open()
  // ---------------------------------------------------------------------

  it('open() defaults deleteItemPersist to false for runtime-only items, true when the item has a file', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'None' } as ItemDetails);
    component.open();
    expect(component.deleteItemPersist).toBe(false);

    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    component.open();
    expect(component.deleteItemPersist).toBe(true);
  });

  it('open() resets deleteItemConfirmChildren to false and makes the dialog visible', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    component.deleteItemConfirmChildren = true;

    component.open();

    expect(component.deleteItemConfirmChildren).toBe(false);
    expect(component.visible()).toBe(true);
  });

  it('open() sorts references: ambiguous first, then eval-family, then structural', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    mockItemsApi.getItemReferences.mockReturnValue(
      of([
        { item: 'z', attribute: 'trigger', value: 'a', unambiguous: true },
        { item: 'y', attribute: 'eval', value: 'sh.a() + sh.b()', unambiguous: false },
        { item: 'x', attribute: 'eval', value: 'sh.a()', unambiguous: true },
        { item: 'w', attribute: 'hysteresis_input', value: 'a', unambiguous: true },
      ]),
    );

    component.open();

    expect(component.deleteItemReferences()?.map((r) => r.item)).toEqual(['y', 'x', 'w', 'z']);
  });

  it('open() is a no-op without an itemDetails path', () => {
    fixture.componentRef.setInput('itemDetails', undefined);

    component.open();

    expect(component.visible()).toBe(false);
  });

  // ---------------------------------------------------------------------
  // confirmDeleteItem()
  // ---------------------------------------------------------------------

  it('confirmDeleteItem() calls removeReferences() before deleteItem() when cleanup is enabled and a cleanable reference exists', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    component.deleteItemReferences.set([
      { item: 'b', attribute: 'eval', value: 'sh.a()', unambiguous: true },
    ]);
    component.deleteItemCleanupReferences = true;

    component.confirmDeleteItem();

    expect(mockItemsApi.removeReferences).toHaveBeenCalledWith('a');
    expect(mockItemsApi.deleteItem).toHaveBeenCalledWith('a', component.deleteItemPersist, false);
  });

  it('confirmDeleteItem() skips removeReferences() when cleanup is disabled', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    component.deleteItemReferences.set([
      { item: 'b', attribute: 'eval', value: 'sh.a()', unambiguous: true },
    ]);
    component.deleteItemCleanupReferences = false;

    component.confirmDeleteItem();

    expect(mockItemsApi.removeReferences).not.toHaveBeenCalled();
    expect(mockItemsApi.deleteItem).toHaveBeenCalledWith('a', component.deleteItemPersist, false);
  });

  it('confirmDeleteItem() skips removeReferences() when no reference is cleanable', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    component.deleteItemReferences.set([
      { item: 'b', attribute: 'eval', value: 'sh.a() + sh.c()', unambiguous: false },
    ]);
    component.deleteItemCleanupReferences = true;

    component.confirmDeleteItem();

    expect(mockItemsApi.removeReferences).not.toHaveBeenCalled();
    expect(mockItemsApi.deleteItem).toHaveBeenCalledWith('a', component.deleteItemPersist, false);
  });

  it('confirmDeleteItem() aborts without deleting when removeReferences() fails', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    component.deleteItemReferences.set([
      { item: 'b', attribute: 'eval', value: 'sh.a()', unambiguous: true },
    ]);
    component.deleteItemCleanupReferences = true;
    mockItemsApi.removeReferences.mockReturnValue(throwError(() => new Error('boom')));

    component.confirmDeleteItem();

    expect(component.deleteItemCleanupFailed()).toBe(true);
    expect(mockItemsApi.deleteItem).not.toHaveBeenCalled();
  });

  it('confirmDeleteItem() passes recursive:true only when the item has children AND the user confirmed', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    fixture.componentRef.setInput('selectedFile', { children: [{ label: 'child' }] });
    component.deleteItemReferences.set([]);
    component.deleteItemConfirmChildren = true;

    component.confirmDeleteItem();

    expect(mockItemsApi.deleteItem).toHaveBeenCalledWith('a', component.deleteItemPersist, true);
  });

  it('confirmDeleteItem() passes recursive:false when the item has children but the user has not confirmed', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    fixture.componentRef.setInput('selectedFile', { children: [{ label: 'child' }] });
    component.deleteItemReferences.set([]);
    component.deleteItemConfirmChildren = false;

    component.confirmDeleteItem();

    expect(mockItemsApi.deleteItem).toHaveBeenCalledWith('a', component.deleteItemPersist, false);
  });

  it('confirmDeleteItem() success closes the dialog and emits deleted', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    component.deleteItemReferences.set([]);
    component.visible.set(true);
    const deletedSpy = jest.fn();
    component.deleted.subscribe(deletedSpy);

    component.confirmDeleteItem();

    expect(component.visible()).toBe(false);
    expect(deletedSpy).toHaveBeenCalled();
  });

  it('confirmDeleteItem() surfaces a server-side error and does not emit deleted', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'created' } as ItemDetails);
    component.deleteItemReferences.set([]);
    mockItemsApi.deleteItem.mockReturnValue(throwError(() => ({ error: { error: 'boom' } })));
    const deletedSpy = jest.fn();
    component.deleted.subscribe(deletedSpy);

    component.confirmDeleteItem();

    expect(component.deleteItemError()).toBe('boom');
    expect(deletedSpy).not.toHaveBeenCalled();
  });

  it('confirmDeleteItem() is a no-op without an itemDetails path', () => {
    fixture.componentRef.setInput('itemDetails', undefined);

    component.confirmDeleteItem();

    expect(mockItemsApi.deleteItem).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // definedInFilename
  // ---------------------------------------------------------------------

  it('definedInFilename appends .yaml when missing', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', filename: 'orbtest' } as ItemDetails);
    expect(component.definedInFilename).toBe('orbtest.yaml');
  });

  it('definedInFilename leaves an already-.yaml filename as-is', () => {
    fixture.componentRef.setInput('itemDetails', {
      path: 'a',
      filename: 'orbtest.yaml',
    } as ItemDetails);
    expect(component.definedInFilename).toBe('orbtest.yaml');
  });
});

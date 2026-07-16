import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import {
  createMockAttributeCatalogService,
  translateTestingModule,
} from '../../../../testing/test-helpers';
import { ItemDetails } from '../../../common/models/item-details';
import { AttributeCatalogService } from '../../../common/services/attribute-catalog.service';
import { ItemsApiService } from '../../../common/services/items-api.service';
import { EditItemDialogComponent } from './edit-item-dialog.component';

describe('EditItemDialogComponent', () => {
  let component: EditItemDialogComponent;
  let fixture: ComponentFixture<EditItemDialogComponent>;
  let mockItemsApi: { editItem: jest.Mock };

  beforeEach(async () => {
    mockItemsApi = {
      editItem: jest.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [EditItemDialogComponent, translateTestingModule],
      providers: [
        { provide: ItemsApiService, useValue: mockItemsApi },
        {
          provide: AttributeCatalogService,
          useValue: createMockAttributeCatalogService({
            type: { type: 'str', valid_list: ['bool', 'num', 'str'], source: 'core' },
            cache: { type: 'bool', source: 'core' },
          }),
        },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditItemDialogComponent);
    component = fixture.componentInstance;
  });

  it('open() makes the dialog visible', () => {
    expect(component.visible()).toBe(false);
    component.open();
    expect(component.visible()).toBe(true);
  });

  // ---------------------------------------------------------------------
  // Seeding from itemDetails
  // ---------------------------------------------------------------------

  it('editItemType/editItemAttributes seed from editable_config, excluding type', () => {
    fixture.componentRef.setInput('itemDetails', {
      path: 'a',
      type: 'num',
      editable_config: { type: 'num', eval: '1', cycle: '30' },
    } as ItemDetails);

    expect(component.editItemType()).toBe('num');
    expect(component.editItemAttributes()).toEqual([
      { key: 'eval', value: '1' },
      { key: 'cycle', value: '30' },
    ]);
  });

  it('editItemType falls back to itemDetails.type when editable_config is absent', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', type: 'bool' } as ItemDetails);

    expect(component.editItemType()).toBe('bool');
    expect(component.editItemAttributes()).toEqual([]);
  });

  it('reopening (visible false→true) rebuilds from the current itemDetails, discarding any unsaved edit', () => {
    fixture.componentRef.setInput('itemDetails', {
      path: 'a',
      type: 'num',
      editable_config: { eval: '1' },
    } as ItemDetails);
    expect(component.editItemAttributes()).toEqual([{ key: 'eval', value: '1' }]);

    // Unsaved local edit, e.g. from typing in a row.
    component.editItemAttributes.set([{ key: 'eval', value: 'unsaved-edit' }]);
    expect(component.editItemAttributes()).toEqual([{ key: 'eval', value: 'unsaved-edit' }]);

    component.visible.set(true);
    component.visible.set(false);
    component.visible.set(true);

    expect(component.editItemAttributes()).toEqual([{ key: 'eval', value: '1' }]);
  });

  // ---------------------------------------------------------------------
  // Attribute rows
  // ---------------------------------------------------------------------

  it('addEditAttributeRow()/removeEditAttributeRow() mutate editItemAttributes', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', type: 'num' } as ItemDetails);

    component.addEditAttributeRow();
    expect(component.editItemAttributes()).toEqual([{ key: '', value: '' }]);

    component.removeEditAttributeRow(0);
    expect(component.editItemAttributes()).toEqual([]);
  });

  it('searchAttributeNames excludes name/type (dedicated fields) and keys already used in another row', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', type: 'num' } as ItemDetails);
    const usedRow = { key: 'cache', value: '' };
    const typingRow = { key: '', value: '' };
    component.editItemAttributes.set([usedRow, typingRow]);

    component.searchAttributeNames({ query: '' }, typingRow);

    expect(component.filteredAttributeNames).not.toContain('type');
    expect(component.filteredAttributeNames).not.toContain('cache');
  });

  // ---------------------------------------------------------------------
  // submitEditItem()
  // ---------------------------------------------------------------------

  it('submitEditItem() calls editItem() with the assembled config, closes the dialog and emits saved', () => {
    fixture.componentRef.setInput('itemDetails', {
      path: 'a',
      type: 'num',
      editable_config: { type: 'num' },
    } as ItemDetails);
    component.visible.set(true);
    component.editItemType.set('str');
    component.editItemAttributes.set([{ key: 'eval', value: '1' }]);
    const savedSpy = jest.fn();
    component.saved.subscribe(savedSpy);

    component.submitEditItem();

    expect(mockItemsApi.editItem).toHaveBeenCalledWith('a', { type: 'str', eval: '1' });
    expect(component.visible()).toBe(false);
    expect(savedSpy).toHaveBeenCalledWith('a');
  });

  it('submitEditItem() surfaces an error, keeps the dialog open and does not emit saved', () => {
    fixture.componentRef.setInput('itemDetails', { path: 'a', type: 'num' } as ItemDetails);
    mockItemsApi.editItem.mockReturnValue(
      throwError(() => ({ error: { error: 'name collision' } })),
    );
    component.visible.set(true);
    const savedSpy = jest.fn();
    component.saved.subscribe(savedSpy);

    component.submitEditItem();

    expect(component.editItemError()).toBe('name collision');
    expect(component.visible()).toBe(true);
    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('submitEditItem() is a no-op without a path', () => {
    fixture.componentRef.setInput('itemDetails', undefined);

    component.submitEditItem();

    expect(mockItemsApi.editItem).not.toHaveBeenCalled();
  });
});

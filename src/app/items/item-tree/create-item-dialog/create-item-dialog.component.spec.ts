import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import {
  createMockAttributeCatalogService,
  translateTestingModule,
} from '../../../../testing/test-helpers';
import { AttributeCatalogService } from '../../../common/services/attribute-catalog.service';
import { FilesApiService } from '../../../common/services/files-api.service';
import { ItemsApiService } from '../../../common/services/items-api.service';
import { CreateItemDialogComponent } from './create-item-dialog.component';

describe('CreateItemDialogComponent', () => {
  let component: CreateItemDialogComponent;
  let fixture: ComponentFixture<CreateItemDialogComponent>;
  let mockItemsApi: { getItemList: jest.Mock; createItem: jest.Mock };
  let mockFilesApi: { getfileList: jest.Mock };

  beforeEach(async () => {
    mockItemsApi = {
      getItemList: jest.fn().mockReturnValue(of([])),
      createItem: jest.fn().mockReturnValue(of({})),
    };
    mockFilesApi = {
      getfileList: jest.fn().mockReturnValue(of(['existing.yaml', 'other.yaml'])),
    };

    await TestBed.configureTestingModule({
      imports: [CreateItemDialogComponent, translateTestingModule],
      providers: [
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: FilesApiService, useValue: mockFilesApi },
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

    fixture = TestBed.createComponent(CreateItemDialogComponent);
    component = fixture.componentInstance;
  });

  // ---------------------------------------------------------------------
  // open()
  // ---------------------------------------------------------------------

  it('open() defaults parent/name/type/persist and makes the dialog visible', () => {
    fixture.componentRef.setInput('parentPath', 'home.light');
    fixture.componentRef.setInput('parentFilename', '');

    component.open();

    expect(component.newItemParent).toBe('home.light');
    expect(component.newItemName).toBe('');
    expect(component.newItemType).toBe('str');
    expect(component.newItemPersist).toBe(true);
    expect(component.newItemAttributes).toEqual([]);
    expect(component.visible()).toBe(true);
  });

  it("open() defaults the filename to the parent item's own file, when it has one", () => {
    fixture.componentRef.setInput('parentFilename', 'items_file');

    component.open();

    expect(component.newItemFilename).toBe('items_file');
  });

  it('open() defaults the filename to empty for a runtime-only parent (backend returns "None") or no parent', () => {
    fixture.componentRef.setInput('parentFilename', 'None');
    component.open();
    expect(component.newItemFilename).toBe('');

    fixture.componentRef.setInput('parentFilename', '');
    component.open();
    expect(component.newItemFilename).toBe('');
  });

  it('open() self-fetches known item paths and item filenames', () => {
    component.open();

    expect(mockItemsApi.getItemList).toHaveBeenCalled();
    expect(mockFilesApi.getfileList).toHaveBeenCalledWith('items');
    expect(component.itemFilenames()).toEqual(['existing', 'other']);
  });

  it('open() does not re-fetch itemFilenames once already loaded', () => {
    component.open();
    component.open();

    expect(mockFilesApi.getfileList).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------

  it('newItemNameValid: no dot in the full path behaves as a single-segment check', () => {
    component.newItemParent = '';
    component.newItemName = 'mynewitem';
    expect(component.newItemNameValid).toBe(true);

    component.newItemName = '1invalid';
    expect(component.newItemNameValid).toBe(false);
  });

  it('newItemNameValid: every dot-separated segment of the full path must be individually valid', () => {
    component.newItemParent = 'a.b';
    component.newItemName = 'newitem';
    expect(component.newItemNameValid).toBe(true);

    component.newItemName = '';
    expect(component.newItemNameValid).toBe(false);
  });

  it('stripFilenameExtension() removes a .yaml/.yml suffix so the field shows what will actually be used', () => {
    component.newItemFilename = 'orbtest.yaml';
    component.stripFilenameExtension();
    expect(component.newItemFilename).toBe('orbtest');

    component.newItemFilename = 'orbtest.yml';
    component.stripFilenameExtension();
    expect(component.newItemFilename).toBe('orbtest');
  });

  // ---------------------------------------------------------------------
  // Attribute rows
  // ---------------------------------------------------------------------

  it('addAttributeRow()/removeAttributeRow() mutate newItemAttributes', () => {
    component.addAttributeRow();
    expect(component.newItemAttributes).toEqual([{ key: '', value: '' }]);

    component.removeAttributeRow(0);
    expect(component.newItemAttributes).toEqual([]);
  });

  it('searchAttributeNames excludes name/type (dedicated fields) and keys already used in another row', () => {
    const usedRow = { key: 'cache', value: '' };
    const typingRow = { key: '', value: '' };
    component.newItemAttributes = [usedRow, typingRow];

    component.searchAttributeNames({ query: '' }, typingRow);

    expect(component.filteredAttributeNames).not.toContain('type');
    expect(component.filteredAttributeNames).not.toContain('cache');
  });

  // ---------------------------------------------------------------------
  // Missing ancestors
  // ---------------------------------------------------------------------

  it('newItemMissingAncestors reflects ancestors of a deep new path that are not already known', () => {
    mockItemsApi.getItemList.mockReturnValue(of(['a', 'a.b']));
    component.open();
    component.newItemParent = 'a.b.c';
    component.newItemName = 'newitem';

    expect(component.newItemMissingAncestors).toEqual(['a.b.c']);
  });

  it('newItemMissingAncestors is empty when the whole parent chain already exists', () => {
    mockItemsApi.getItemList.mockReturnValue(of(['a', 'a.b', 'a.b.c']));
    component.open();
    component.newItemParent = 'a.b.c';
    component.newItemName = 'newitem';

    expect(component.newItemMissingAncestors).toEqual([]);
  });

  // ---------------------------------------------------------------------
  // submitNewItem()
  // ---------------------------------------------------------------------

  it('submitNewItem() is a no-op when the name is invalid', () => {
    component.newItemName = '1invalid';
    component.submitNewItem();
    expect(mockItemsApi.createItem).not.toHaveBeenCalled();
  });

  it('submitNewItem() with no missing ancestors creates the item directly, createMissingParents false', () => {
    component.newItemParent = '';
    component.newItemName = 'mynewitem';

    component.submitNewItem();

    expect(mockItemsApi.createItem).toHaveBeenCalledWith(
      'mynewitem',
      { type: 'str' },
      true,
      undefined,
      false,
    );
  });

  it('submitNewItem() passes non-string attribute values (array/object/boolean) through as-is', () => {
    component.newItemName = 'mynewitem';
    component.newItemAttributes = [
      { key: 'cache', value: true },
      { key: 'mylist', value: ['a', 'b'] },
    ];

    component.submitNewItem();

    expect(mockItemsApi.createItem).toHaveBeenCalledWith(
      'mynewitem',
      { type: 'str', cache: true, mylist: ['a', 'b'] },
      true,
      undefined,
      false,
    );
  });

  it('submitNewItem() with missing ancestors makes a single request with createMissingParents true', () => {
    mockItemsApi.getItemList.mockReturnValue(of(['a']));
    component.open();
    component.newItemParent = 'a.b.c';
    component.newItemName = 'newitem';

    component.submitNewItem();

    expect(mockItemsApi.createItem).toHaveBeenCalledTimes(1);
    expect(mockItemsApi.createItem).toHaveBeenCalledWith(
      'a.b.c.newitem',
      { type: 'str' },
      true,
      undefined,
      true,
    );
  });

  it('submitNewItem() success closes the dialog and emits created with the full path', () => {
    const createdSpy = jest.fn();
    component.created.subscribe(createdSpy);
    component.newItemParent = '';
    component.newItemName = 'mynewitem';
    component.visible.set(true);

    component.submitNewItem();

    expect(component.visible()).toBe(false);
    expect(createdSpy).toHaveBeenCalledWith('mynewitem');
  });

  it('submitNewItem() surfaces a server-side error as newItemError and does not emit created', () => {
    mockItemsApi.createItem.mockReturnValue(throwError(() => ({ error: { error: 'boom' } })));
    const createdSpy = jest.fn();
    component.created.subscribe(createdSpy);
    component.newItemName = 'mynewitem';

    component.submitNewItem();

    expect(component.newItemError()).toBe('boom');
    expect(createdSpy).not.toHaveBeenCalled();
  });
});

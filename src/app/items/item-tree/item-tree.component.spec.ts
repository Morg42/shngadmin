import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Tree } from 'primeng/tree';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  createMockWebsocketPluginService,
  createMockWebsocketService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ItemsApiService } from '../../common/services/items-api.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { WebsocketPluginService } from '../../common/services/websocket-plugin.service';
import { WebsocketService } from '../../common/services/websocket.service';
import { ItemTreeComponent } from './item-tree.component';

describe('ItemTreeComponent', () => {
  let component: ItemTreeComponent;
  let fixture: ComponentFixture<ItemTreeComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    const mockWebsocketPlugin = {
      ...createMockWebsocketPluginService(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      getMonitoredItems: jest.fn(),
      monitoredItemsUpdate$: new BehaviorSubject(null),
      monitor: { items: [] },
    };

    const mockItemsApi = {
      getItemList: jest.fn().mockReturnValue(of([])),
      getItemTree: jest.fn().mockReturnValue(of([0, []])),
      getItemDetails: jest.fn().mockReturnValue(of([{}])),
      changeItemValue: jest.fn().mockReturnValue(of({})),
      createItem: jest.fn().mockReturnValue(of({})),
      editItem: jest.fn().mockReturnValue(of({ result: 'ok' })),
      renameItem: jest
        .fn()
        .mockReturnValue(
          of({ result: 'ok', new_path: 'new', rewritten_references: [], failed_references: [] }),
        ),
      deleteItem: jest.fn().mockReturnValue(of({})),
      getItemReferences: jest.fn().mockReturnValue(of([])),
      removeReferences: jest.fn().mockReturnValue(of({ removed: [], skipped_ambiguous: [] })),
      getCoreItemAttributes: jest.fn().mockReturnValue(of({})),
    };

    const mockPluginsApi = {
      getPluginsInfo: jest.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ItemTreeComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: WebsocketService, useValue: createMockWebsocketService() },
        { provide: WebsocketPluginService, useValue: mockWebsocketPlugin },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ItemTreeComponent, {
        set: {
          imports: [TranslatePipe, Tree],
          // Component declares its own providers; override them with mocks so the
          // real WebsocketPluginService constructor doesn't run and build a ws:// URL
          providers: [
            { provide: WebsocketService, useValue: createMockWebsocketService() },
            { provide: WebsocketPluginService, useValue: mockWebsocketPlugin },
          ],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ItemTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deleteItemHasFile is false for runtime-only items (backend returns filename "None")', () => {
    component.itemdetails = { path: 'a', filename: 'None' } as never;
    expect(component.deleteItemHasFile).toBe(false);
  });

  it('deleteItemHasFile is true when the item has a real source file', () => {
    component.itemdetails = { path: 'a', filename: 'created' } as never;
    expect(component.deleteItemHasFile).toBe(true);
  });

  it('openDeleteItemDialog() defaults deleteItemPersist to false for runtime-only items', () => {
    component.itemdetails = { path: 'a', filename: 'None' } as never;
    component.openDeleteItemDialog();
    expect(component.deleteItemPersist).toBe(false);
  });

  it('openDeleteItemDialog() defaults deleteItemPersist to true when the item has a file', () => {
    component.itemdetails = { path: 'a', filename: 'created' } as never;
    component.openDeleteItemDialog();
    expect(component.deleteItemPersist).toBe(true);
  });

  it('getItemtree(selectPath) re-selects the node at that path in the rebuilt tree', () => {
    const tree = {
      label: 'root',
      children: [
        {
          label: 'a',
          path: 'a',
          children: [{ label: 'b', path: 'a.b', children: [] }],
        },
      ],
    };
    TestBed.inject(ItemsApiService).getItemTree = jest.fn().mockReturnValue(of([1, [tree]]));

    component.getItemtree('a.b');

    expect(component.selectedFile).toBeTruthy();
    expect((component.selectedFile as unknown as { path: string }).path).toBe('a.b');
    expect(TestBed.inject(ItemsApiService).getItemDetails).toHaveBeenCalledWith('a.b');
  });

  it('getItemtree(selectPath) is a no-op selection-wise when the path is not found', () => {
    component.selectedFile = undefined as never;
    component.getItemtree('does.not.exist');
    expect(component.selectedFile).toBeUndefined();
  });

  it('openDeleteItemDialog() sorts references: ambiguous first, then eval-family, then structural', () => {
    component.itemdetails = { path: 'a', filename: 'created' } as never;
    TestBed.inject(ItemsApiService).getItemReferences = jest.fn().mockReturnValue(
      of([
        { item: 'z', attribute: 'trigger', value: 'a', unambiguous: true },
        { item: 'y', attribute: 'eval', value: 'sh.a() + sh.b()', unambiguous: false },
        { item: 'x', attribute: 'eval', value: 'sh.a()', unambiguous: true },
        { item: 'w', attribute: 'hysteresis_input', value: 'a', unambiguous: true },
      ]),
    );

    component.openDeleteItemDialog();

    expect(component.deleteItemReferences?.map((r) => r.item)).toEqual(['y', 'x', 'w', 'z']);
  });

  it('confirmDeleteItem() calls removeReferences() before deleteItem() when cleanup is enabled and a cleanable reference exists', () => {
    component.itemdetails = { path: 'a', filename: 'created' } as never;
    component.deleteItemReferences = [
      { item: 'b', attribute: 'eval', value: 'sh.a()', unambiguous: true },
    ];
    component.deleteItemCleanupReferences = true;

    component.confirmDeleteItem();

    expect(TestBed.inject(ItemsApiService).removeReferences).toHaveBeenCalledWith('a');
    expect(TestBed.inject(ItemsApiService).deleteItem).toHaveBeenCalledWith(
      'a',
      component.deleteItemPersist,
    );
  });

  it('confirmDeleteItem() skips removeReferences() when cleanup is disabled', () => {
    component.itemdetails = { path: 'a', filename: 'created' } as never;
    component.deleteItemReferences = [
      { item: 'b', attribute: 'eval', value: 'sh.a()', unambiguous: true },
    ];
    component.deleteItemCleanupReferences = false;

    component.confirmDeleteItem();

    expect(TestBed.inject(ItemsApiService).removeReferences).not.toHaveBeenCalled();
    expect(TestBed.inject(ItemsApiService).deleteItem).toHaveBeenCalledWith(
      'a',
      component.deleteItemPersist,
    );
  });

  it('confirmDeleteItem() skips removeReferences() when no reference is cleanable', () => {
    component.itemdetails = { path: 'a', filename: 'created' } as never;
    component.deleteItemReferences = [
      { item: 'b', attribute: 'eval', value: 'sh.a() + sh.c()', unambiguous: false },
    ];
    component.deleteItemCleanupReferences = true;

    component.confirmDeleteItem();

    expect(TestBed.inject(ItemsApiService).removeReferences).not.toHaveBeenCalled();
    expect(TestBed.inject(ItemsApiService).deleteItem).toHaveBeenCalledWith(
      'a',
      component.deleteItemPersist,
    );
  });

  it('confirmDeleteItem() aborts without deleting when removeReferences() fails', () => {
    component.itemdetails = { path: 'a', filename: 'created' } as never;
    component.deleteItemReferences = [
      { item: 'b', attribute: 'eval', value: 'sh.a()', unambiguous: true },
    ];
    component.deleteItemCleanupReferences = true;
    TestBed.inject(ItemsApiService).removeReferences = jest
      .fn()
      .mockReturnValue(throwError(() => new Error('boom')));
    (TestBed.inject(ItemsApiService).deleteItem as jest.Mock).mockClear();

    component.confirmDeleteItem();

    expect(component.deleteItemCleanupFailed).toBe(true);
    expect(TestBed.inject(ItemsApiService).deleteItem).not.toHaveBeenCalled();
  });

  it('openEditItemDialog() pre-populates from editable_config, excluding type', () => {
    component.itemdetails = {
      path: 'a',
      type: 'num',
      editable_config: { type: 'num', eval: '1', cycle: '30' },
    } as never;

    component.openEditItemDialog();

    expect(component.editItemType).toBe('num');
    expect(component.editItemAttributes).toEqual([
      { key: 'eval', value: '1' },
      { key: 'cycle', value: '30' },
    ]);
    expect(component.editItem_display).toBe(true);
  });

  it('openEditItemDialog() falls back to itemdetails.type when editable_config is absent', () => {
    component.itemdetails = { path: 'a', type: 'bool' } as never;

    component.openEditItemDialog();

    expect(component.editItemType).toBe('bool');
    expect(component.editItemAttributes).toEqual([]);
  });

  it('submitEditItem() calls editItem() with the assembled config and refreshes details on success', () => {
    component.itemdetails = { path: 'a', type: 'num', editable_config: { type: 'num' } } as never;
    component.editItemType = 'str';
    component.editItemAttributes = [{ key: 'eval', value: '1' }];

    component.submitEditItem();

    expect(TestBed.inject(ItemsApiService).editItem).toHaveBeenCalledWith('a', {
      type: 'str',
      eval: '1',
    });
    expect(TestBed.inject(ItemsApiService).getItemDetails).toHaveBeenCalledWith('a');
    expect(component.editItem_display).toBe(false);
  });

  it('submitEditItem() surfaces an error and keeps the dialog open on failure', () => {
    component.itemdetails = { path: 'a', type: 'num', editable_config: {} } as never;
    component.editItemType = 'num';
    component.editItemAttributes = [];
    component.editItem_display = true;
    TestBed.inject(ItemsApiService).editItem = jest
      .fn()
      .mockReturnValue(
        throwError(() => ({ error: { error: 'name collision' } }) as unknown as Error),
      );

    component.submitEditItem();

    expect(component.editItemError).toBe('name collision');
    expect(component.editItem_display).toBe(true);
  });

  it('addEditAttributeRow()/removeEditAttributeRow() mutate editItemAttributes only', () => {
    component.itemdetails = { path: 'a', type: 'num', editable_config: {} } as never;
    component.openEditItemDialog();
    component.newItemAttributes = [{ key: 'unrelated', value: '' }];

    component.addEditAttributeRow();
    expect(component.editItemAttributes).toEqual([{ key: '', value: '' }]);
    expect(component.newItemAttributes).toEqual([{ key: 'unrelated', value: '' }]);

    component.removeEditAttributeRow(0);
    expect(component.editItemAttributes).toEqual([]);
  });

  it('the attribute browser fills rows in whichever dialog is currently active', () => {
    component.itemdetails = { path: 'a', type: 'num', editable_config: {} } as never;
    component.openEditItemDialog();
    component.editItemAttributes = [{ key: '', value: '' }];

    component.selectAttributeFromBrowser('eval');

    expect(component.editItemAttributes).toEqual([{ key: 'eval', value: '' }]);
    expect(component.newItemAttributes).toEqual([]);
  });

  it('openRenameItemDialog() pre-fills the complete current path for a nested item', () => {
    component.itemdetails = { path: 'home.light.switch' } as never;

    component.openRenameItemDialog();

    expect(component.renameItemNewPathInput).toBe('home.light.switch');
    expect(component.renameItem_display).toBe(true);
  });

  it('openRenameItemDialog() pre-fills the whole path for a top-level item too', () => {
    component.itemdetails = { path: 'toplevel' } as never;

    component.openRenameItemDialog();

    expect(component.renameItemNewPathInput).toBe('toplevel');
  });

  it('renameItemNewPath trims the input as-is, dotted or not', () => {
    component.renameItemNewPathInput = '  switch  ';
    expect(component.renameItemNewPath).toBe('switch');

    component.renameItemNewPathInput = 'home.light.switch';
    expect(component.renameItemNewPath).toBe('home.light.switch');
  });

  it('renameItemNewPathValid validates every dot-separated segment', () => {
    component.renameItemNewPathInput = 'home.light.switch';
    expect(component.renameItemNewPathValid).toBe(true);

    component.renameItemNewPathInput = 'home.123invalid.switch';
    expect(component.renameItemNewPathValid).toBe(false);

    component.renameItemNewPathInput = '';
    expect(component.renameItemNewPathValid).toBe(false);
  });

  it('selectRenameParent() rewrites just the parent prefix, keeping the typed leaf', () => {
    component.renameItemNewPathInput = 'myleaf';
    component.selectRenameParent({ node: { path: 'new.parent' } } as never);
    expect(component.renameItemNewPathInput).toBe('new.parent.myleaf');
  });

  it('selectRenameParent() with the synthetic top-level node (path "") leaves just the leaf', () => {
    component.renameItemNewPathInput = 'old.parent.myleaf';
    component.selectRenameParent({ node: { path: '' } } as never);
    expect(component.renameItemNewPathInput).toBe('myleaf');
  });

  it('submitRenameItem() calls renameItem() with the input path as-is and refreshes the tree on success', () => {
    component.itemdetails = { path: 'old' } as never;
    component.renameItemNewPathInput = 'new.parent.newname';

    component.submitRenameItem();

    expect(TestBed.inject(ItemsApiService).renameItem).toHaveBeenCalledWith(
      'old',
      'new.parent.newname',
    );
    expect(component.renameItem_display).toBe(false);
  });

  it('submitRenameItem() shows the old and new path in the success toast', () => {
    component.itemdetails = { path: 'old' } as never;
    component.renameItemNewPathInput = 'new.parent.newname';
    const messageService = TestBed.inject(MessageService);
    jest.spyOn(messageService, 'add');

    component.submitRenameItem();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'old -> new.parent.newname' }),
    );
  });

  it('submitRenameItem() records failed_references for the persistent panel note', () => {
    component.itemdetails = { path: 'old' } as never;
    component.renameItemNewPathInput = 'new';
    TestBed.inject(ItemsApiService).renameItem = jest.fn().mockReturnValue(
      of({
        result: 'ok',
        new_path: 'new',
        rewritten_references: ['other'],
        failed_references: [['broken', 'some error']],
      }),
    );

    component.submitRenameItem();

    expect(component.renameItemLastFailedReferences).toEqual([['broken', 'some error']]);
  });

  it('submitRenameItem() sets renameItemSubmitting while the request is in flight, then clears it on success', () => {
    component.itemdetails = { path: 'old' } as never;
    component.renameItemNewPathInput = 'new';
    const subject = new Subject<{
      result: string;
      new_path: string;
      rewritten_references: string[];
      failed_references: [string, string][];
    }>();
    TestBed.inject(ItemsApiService).renameItem = jest.fn().mockReturnValue(subject.asObservable());

    component.submitRenameItem();
    expect(component.renameItemSubmitting).toBe(true);

    subject.next({
      result: 'ok',
      new_path: 'new',
      rewritten_references: [],
      failed_references: [],
    });
    expect(component.renameItemSubmitting).toBe(false);
  });

  it('submitRenameItem() clears renameItemSubmitting on an ordinary error', () => {
    component.itemdetails = { path: 'old' } as never;
    component.renameItemNewPathInput = 'new';
    TestBed.inject(ItemsApiService).renameItem = jest
      .fn()
      .mockReturnValue(throwError(() => ({ error: { error: 'collision' } }) as unknown as Error));

    component.submitRenameItem();

    expect(component.renameItemSubmitting).toBe(false);
  });

  it('submitRenameItem() is a no-op when the new path is invalid', () => {
    component.itemdetails = { path: 'old' } as never;
    component.renameItemNewPathInput = '123invalid';

    component.submitRenameItem();

    expect(TestBed.inject(ItemsApiService).renameItem).not.toHaveBeenCalled();
  });

  it('submitRenameItem() surfaces an ordinary error and keeps the dialog open', () => {
    component.itemdetails = { path: 'old' } as never;
    component.renameItemNewPathInput = 'new';
    component.renameItem_display = true;
    TestBed.inject(ItemsApiService).renameItem = jest
      .fn()
      .mockReturnValue(throwError(() => ({ error: { error: 'collision' } }) as unknown as Error));

    component.submitRenameItem();

    expect(component.renameItemError).toBe('collision');
    expect(component.renameItem_display).toBe(true);
  });

  it('submitRenameItem() shows a specific message when the new path would make the item a child of itself', () => {
    component.itemdetails = { path: 'a.b' } as never;
    component.renameItemNewPathInput = 'a.b.b';
    component.renameItem_display = true;
    TestBed.inject(ItemsApiService).renameItem = jest.fn().mockReturnValue(
      throwError(
        () =>
          ({
            error: {
              error:
                "Item 'a.b' cannot be renamed to 'a.b.b': item cannot become a child of itself",
            },
          }) as unknown as Error,
      ),
    );

    component.submitRenameItem();

    expect(component.renameItemError).toBe(
      TestBed.inject(TranslateService).instant('ITEMS.RENAME_CYCLE'),
    );
    expect(component.renameItem_display).toBe(true);
  });

  it('submitRenameItem() offers to create missing parents instead of erroring out, when the backend reports a missing parent', () => {
    component.itemdetails = { path: 'old' } as never;
    component.renameItemNewPathInput = 'a.b.d.newname';
    TestBed.inject(ItemsApiService).renameItem = jest.fn().mockReturnValue(
      throwError(
        () =>
          ({
            error: {
              error: "Item 'old' cannot be renamed to 'a.b.d.newname': parent 'a.b.d' not found",
            },
          }) as unknown as Error,
      ),
    );
    TestBed.inject(ItemsApiService).getItemList = jest.fn().mockReturnValue(of(['a', 'a.b']));

    component.submitRenameItem();

    expect(component.renameItemMissingAncestors).toEqual(['a.b.d']);
    expect(component.renameItemConfirmCreateParents_display).toBe(true);
    expect(component.renameItemError).toBe('');
  });

  it('confirmCreateMissingParents() creates each missing ancestor as type foo, then retries the rename', () => {
    component.itemdetails = { path: 'old', filename: 'created' } as never;
    component.renameItemNewPathInput = 'a.b.d.newname';
    component.renameItemMissingAncestors = ['a.b', 'a.b.d'];
    const createItemMock = TestBed.inject(ItemsApiService).createItem as jest.Mock;
    createItemMock.mockReturnValue(of({}));

    component.confirmCreateMissingParents();

    expect(createItemMock).toHaveBeenNthCalledWith(1, 'a.b', { type: 'foo' }, true, 'created');
    expect(createItemMock).toHaveBeenNthCalledWith(2, 'a.b.d', { type: 'foo' }, true, 'created');
    expect(TestBed.inject(ItemsApiService).renameItem).toHaveBeenCalledWith('old', 'a.b.d.newname');
    expect(component.renameItemConfirmCreateParents_display).toBe(false);
  });

  it('confirmCreateMissingParents() creates ancestors as runtime-only when the moved item itself is not persisted', () => {
    component.itemdetails = { path: 'old', filename: 'None' } as never;
    component.renameItemNewPathInput = 'a.newname';
    component.renameItemMissingAncestors = ['a'];
    const createItemMock = TestBed.inject(ItemsApiService).createItem as jest.Mock;
    createItemMock.mockReturnValue(of({}));

    component.confirmCreateMissingParents();

    expect(createItemMock).toHaveBeenCalledWith('a', { type: 'foo' }, false, undefined);
  });
});

describe('ItemTreeComponent attribute catalog', () => {
  let component: ItemTreeComponent;
  let fixture: ComponentFixture<ItemTreeComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    const mockWebsocketPlugin = {
      ...createMockWebsocketPluginService(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      getMonitoredItems: jest.fn(),
      monitoredItemsUpdate$: new BehaviorSubject(null),
      monitor: { items: [] },
    };

    const mockItemsApi = {
      getItemTree: () => of([0, []]),
      getItemDetails: () => of([{}]),
      changeItemValue: jest.fn().mockReturnValue(of({})),
      createItem: jest.fn().mockReturnValue(of({})),
      deleteItem: jest.fn().mockReturnValue(of({})),
      getItemReferences: jest.fn().mockReturnValue(of([])),
      getCoreItemAttributes: jest.fn().mockReturnValue(
        of({
          autotimer: { type: 'str', description: { de: 'Automatik-Timer', en: 'Autotimer' } },
          cache: { type: 'bool' },
          type: { type: 'str', valid_list: ['bool', 'num', 'str'] },
        }),
      ),
    };

    const mockPluginsApi = {
      getPluginsInfo: jest.fn().mockReturnValue(
        of([
          {
            pluginname: 'someplugin',
            attributes: [
              { name: 'autotimer', type: 'str' },
              { name: 'someplugin_attr', type: 'num', description: { en: 'Plugin attr' } },
              { name: 'type', type: 'bool' },
            ],
          },
        ]),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [ItemTreeComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: WebsocketService, useValue: createMockWebsocketService() },
        { provide: WebsocketPluginService, useValue: mockWebsocketPlugin },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ItemTreeComponent, {
        set: {
          imports: [TranslatePipe, Tree],
          providers: [
            { provide: WebsocketService, useValue: createMockWebsocketService() },
            { provide: WebsocketPluginService, useValue: mockWebsocketPlugin },
          ],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ItemTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('merges core and plugin attributes, plugin entry wins on name collision', () => {
    expect(component.attributeCatalog['autotimer']).toEqual({
      name: 'autotimer',
      type: 'str',
      source: 'someplugin',
    });
    expect(component.attributeCatalog['someplugin_attr']).toEqual({
      name: 'someplugin_attr',
      type: 'num',
      description: { en: 'Plugin attr' },
      source: 'someplugin',
    });
  });

  it('a plugin attribute named "type" never overrides core\'s "type" entry (dedicated field)', () => {
    expect(component.attributeCatalog['type']).toEqual({
      type: 'str',
      valid_list: ['bool', 'num', 'str'],
      source: 'core',
    });
  });

  it('itemTypeOptions is derived from the catalog "type" attribute valid_list', () => {
    expect(component.itemTypeOptions).toEqual([
      { label: 'bool', value: 'bool' },
      { label: 'num', value: 'num' },
      { label: 'str', value: 'str' },
    ]);
  });

  it('attributeGroups groups suggestions by source, core first', () => {
    expect(component.attributeGroups.map((g) => g.source)).toEqual(['core', 'someplugin']);
    const pluginGroup = component.attributeGroups.find((g) => g.source === 'someplugin');
    expect(pluginGroup?.entries.map((e) => e.name)).toEqual(['autotimer', 'someplugin_attr']);
  });

  it('searchAttributeNames excludes name/type (dedicated fields) from suggestions', () => {
    component.searchAttributeNames({ query: '' });
    expect(component.filteredAttributeNames).not.toContain('type');
    expect(component.filteredAttributeNames).not.toContain('name');
    expect(component.filteredAttributeNames).toContain('someplugin_attr');
  });

  it('attributeDescription() returns "" for attributes with no description (e.g. overwritten by a plugin entry without one)', () => {
    expect(component.attributeDescription('autotimer')).toBe('');
  });

  it('attributeDescription() returns "" for unknown attribute names', () => {
    expect(component.attributeDescription('does_not_exist')).toBe('');
  });

  it('attributeDescription() falls back to English when the current language has no translation', () => {
    TestBed.inject(TranslateService).use('de');
    fixture.detectChanges();
    expect(component.attributeDescription('someplugin_attr')).toBe('Plugin attr');
  });

  it('attributeType() returns the catalog type, "" for unknown attribute names', () => {
    expect(component.attributeType('cache')).toBe('bool');
    expect(component.attributeType('does_not_exist')).toBe('');
  });

  it('attributeValidList() returns the catalog valid_list, undefined when absent', () => {
    expect(component.attributeValidList('type')).toEqual(['bool', 'num', 'str']);
    expect(component.attributeValidList('cache')).toBeUndefined();
  });

  it('submitNewItem() passes non-string attribute values (array/object/boolean) through to createItem() as-is', () => {
    component.newItemName = 'mynewitem';
    component.newItemAttributes = [
      { key: 'cache', value: true },
      { key: 'mylist', value: ['a', 'b'] },
      { key: 'mydict', value: { k: 'v' } },
    ];

    component.submitNewItem();

    expect(TestBed.inject(ItemsApiService).createItem).toHaveBeenCalledWith(
      'mynewitem',
      { type: 'str', cache: true, mylist: ['a', 'b'], mydict: { k: 'v' } },
      true,
      undefined,
    );
  });

  it('selectAttributeFromBrowser() fills the first empty row and closes the browser', () => {
    component.newItemAttributes = [{ key: '', value: '' }];
    component.attributeBrowser_display = true;
    component.selectAttributeFromBrowser('someplugin_attr');
    expect(component.newItemAttributes).toEqual([{ key: 'someplugin_attr', value: '' }]);
    expect(component.attributeBrowser_display).toBe(false);
  });

  it('selectAttributeFromBrowser() adds a new row when no row is empty', () => {
    component.newItemAttributes = [{ key: 'autotimer', value: 'true' }];
    component.selectAttributeFromBrowser('someplugin_attr');
    expect(component.newItemAttributes).toEqual([
      { key: 'autotimer', value: 'true' },
      { key: 'someplugin_attr', value: '' },
    ]);
  });

  it('filteredAttributeGroups excludes attribute names already used in another row', () => {
    component.newItemAttributes = [{ key: 'someplugin_attr', value: '' }];
    component.attributeBrowserSearch = '';
    const names = component.filteredAttributeGroups.flatMap((g) => g.entries.map((e) => e.name));
    expect(names).not.toContain('someplugin_attr');
    expect(names).toContain('autotimer');
  });
});

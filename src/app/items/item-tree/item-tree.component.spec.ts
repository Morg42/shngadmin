import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Tree } from 'primeng/tree';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAttributeCatalogService,
  createMockAuthService,
  createMockWebsocketPluginService,
  createMockWebsocketService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AttributeCatalogService } from '../../common/services/attribute-catalog.service';
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
    };

    const mockPluginsApi = {};

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
        { provide: AttributeCatalogService, useValue: createMockAttributeCatalogService() },
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

  // Regression tests for the "more actions" popup menu eating clicks: when
  // itemActionsMenuItems was a plain getter, it returned a brand-new array
  // of brand-new object literals on every read, so PrimeNG's untracked
  // *ngFor tore down and rebuilt the popup's <li>s on every unrelated
  // change-detection tick while it was open - dropping a click that landed
  // mid-rebuild. Built once into a signal instead, the reference must stay
  // stable across CD cycles UNLESS something it actually depends on
  // changes (a real language switch) - two reads with nothing in between
  // would pass trivially for any signal regardless of correctness, so
  // these drive an unrelated signal write (mimicking the websocket-pushed
  // monitored-item update that originally triggered the bug) and a real
  // translate.use() language switch between reads instead.
  it('itemActionsMenuItems stays referentially stable across an unrelated signal write and CD cycle', () => {
    TestBed.inject(TranslateService).use('de');
    fixture.detectChanges();
    const first = component.itemActionsMenuItems();

    component.itemcount.set(component.itemcount() + 1);
    fixture.detectChanges();

    expect(component.itemActionsMenuItems()).toBe(first);
  });

  it('itemActionsMenuItems rebuilds with a new reference when the language actually changes', () => {
    const translate = TestBed.inject(TranslateService);
    translate.use('de');
    fixture.detectChanges();
    const first = component.itemActionsMenuItems();

    translate.use('en');
    fixture.detectChanges();

    expect(component.itemActionsMenuItems()).not.toBe(first);
  });
});

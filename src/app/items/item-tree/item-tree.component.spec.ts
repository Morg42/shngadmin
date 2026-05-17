import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  createMockOlddataService,
  createMockWebsocketPluginService,
  createMockWebsocketService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { OlddataService } from '../../common/services/olddata.service';
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

    const mockOlddata = {
      ...createMockOlddataService(),
      getItemtree: () => of([0, []]),
      getItemDetails: () => of([{}]),
      changeItemValue: jest.fn(),
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
        { provide: OlddataService, useValue: mockOlddata },
        { provide: WebsocketService, useValue: createMockWebsocketService() },
        { provide: WebsocketPluginService, useValue: mockWebsocketPlugin },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ItemTreeComponent, {
        set: {
          imports: [TranslatePipe],
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
});

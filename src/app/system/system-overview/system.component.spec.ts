import { CommonModule } from '@angular/common';
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
import { SystemComponent } from './system.component';

describe('SystemComponent', () => {
  let component: SystemComponent;
  let fixture: ComponentFixture<SystemComponent>;

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
      getSeriesLoad: jest.fn(),
      getSeriesSystemMemory: jest.fn(),
      getSeriesSwap: jest.fn(),
      getSeriesMemory: jest.fn(),
      getSeriesThreads: jest.fn(),
      getSeriesWorkerThreads: jest.fn(),
      getSeriesDisk: jest.fn(),
      systemloadUpdate$: new BehaviorSubject(null),
      systemmemoryUpdate$: new BehaviorSubject(null),
      systemswapUpdate$: new BehaviorSubject(null),
      memoryUpdate$: new BehaviorSubject(null),
      threadsUpdate$: new BehaviorSubject(null),
      workerThreadsUpdate$: new BehaviorSubject(null),
      idleWorkerThreadsUpdate$: new BehaviorSubject(null),
      diskUpdate$: new BehaviorSubject(null),
      systemload: { series: [] },
      systemmemory: { series: [] },
      systemswap: { series: [] },
      memory: { series: [] },
      threads: { series: [] },
      workerThreads: { series: [] },
      idleWorkerThreads: { series: [] },
      disk: { series: [] },
      monitor: { items: [] },
    };

    const mockOlddata = {
      ...createMockOlddataService(),
      getSysteminfo: () => of({}),
      getPypiinfo: () => of([]),
      getItemtree: () => of([0, []]),
      getItemDetails: () => of([{}]),
      changeItemValue: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SystemComponent, translateTestingModule],
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
        { provide: 'BASE_URL', useValue: 'http://localhost/' },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SystemComponent, {
        set: {
          imports: [TranslatePipe, CommonModule],
          // Component declares its own providers; override them with mocks
          providers: [
            { provide: WebsocketService, useValue: createMockWebsocketService() },
            { provide: WebsocketPluginService, useValue: mockWebsocketPlugin },
          ],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

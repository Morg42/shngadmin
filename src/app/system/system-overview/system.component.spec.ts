import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import pypiFixture from '../../../testing/fixtures/pypi.json';
import systeminfoFixture from '../../../testing/fixtures/systeminfo.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  createMockWebsocketService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { WebsocketPluginService } from '../../common/services/websocket-plugin.service';
import { WebsocketService } from '../../common/services/websocket.service';
import { SystemComponent } from './system.component';

describe('SystemComponent', () => {
  let component: SystemComponent;
  let fixture: ComponentFixture<SystemComponent>;

  const mockWebsocketPlugin = {
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
  };

  const mockServerApi = {
    getSystemStats: () => of(systeminfoFixture),
    getPypiInfo: () => of(pypiFixture),
    getServerBasicinfo: () => of({}),
    getServerinfo: () => of({}),
    shng_serverinfo: {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: WebsocketService, useValue: createMockWebsocketService() },
        { provide: WebsocketPluginService, useValue: mockWebsocketPlugin },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SystemComponent, {
        set: {
          imports: [TranslatePipe, CommonModule],
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

  it('should populate systeminfo from fixture', () => {
    expect(component.systeminfo.sh_vers).toBe(systeminfoFixture.sh_vers);
    expect(component.systeminfo.node).toBe(systeminfoFixture.node);
  });

  it('should populate pypiinfo after switching to PyPI tab', fakeAsync(() => {
    component.onTabChange('2');
    tick(0);
    expect(component.pypiinfo.length).toBe(pypiFixture.length);
  }));

  it('should set loading to false after pypi data arrives', fakeAsync(() => {
    component.onTabChange('2');
    tick(0);
    expect(component.loading).toBe(false);
  }));

  it('should count plugin requirements correctly from pypi fixture', fakeAsync(() => {
    component.onTabChange('2');
    tick(0);
    const expected = pypiFixture.filter((p) => p.is_required_for_plugins === true).length;
    expect(component.plugincount).toBe(expected);
  }));
});

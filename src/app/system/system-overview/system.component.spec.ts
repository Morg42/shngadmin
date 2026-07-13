import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
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
    systemload: signal({ series: [], tsdiff: 0 }),
    systemmemory: signal({ series: [], tsdiff: 0 }),
    systemswap: signal({ series: [], tsdiff: 0 }),
    memory: signal({ series: [], tsdiff: 0 }),
    threads: signal({ series: [], tsdiff: 0 }),
    workerThreads: signal({ series: [], tsdiff: 0 }),
    idleWorkerThreads: signal({ series: [], tsdiff: 0 }),
    disk: signal({ series: [], tsdiff: 0 }),
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
    expect(component.systeminfo().sh_vers).toBe(systeminfoFixture.sh_vers);
    expect(component.systeminfo().node).toBe(systeminfoFixture.node);
  });

  // startPypiPoll() drives its first fetch through timer(0, 5000), which
  // schedules via setTimeout even for a 0ms delay - fakeAsync()/tick() need
  // zone.js (unavailable now that the app is zoneless), so these use Jest's
  // own fake timers instead, which patch setTimeout directly and don't care
  // whether zone.js is loaded.
  describe('PyPI tab (fake timers)', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should populate pypiinfo after switching to PyPI tab', async () => {
      jest.useFakeTimers();
      component.onTabChange('2');
      await jest.advanceTimersByTimeAsync(0);
      expect(component.pypiinfo().length).toBe(pypiFixture.length);
    });

    it('should set loading to false after pypi data arrives', async () => {
      jest.useFakeTimers();
      component.onTabChange('2');
      await jest.advanceTimersByTimeAsync(0);
      expect(component.loading()).toBe(false);
    });

    it('should count plugin requirements correctly from pypi fixture', async () => {
      jest.useFakeTimers();
      component.onTabChange('2');
      await jest.advanceTimersByTimeAsync(0);
      const expected = pypiFixture.filter((p) => p.is_required_for_plugins === true).length;
      expect(component.plugincount()).toBe(expected);
    });
  });
});

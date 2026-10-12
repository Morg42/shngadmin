import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Observable, of } from 'rxjs';
import cacheFixture from '../../testing/fixtures/api/services/cachecheck/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../testing/test-helpers';
import { AppConfigService } from '../common/services/app-config.service';
import { AuthService } from '../common/services/auth.service';
import { FilesApiService } from '../common/services/files-api.service';
import { ServerApiService } from '../common/services/server-api.service';
import { ServicesApiService } from '../common/services/services-api.service';
import { UserPreferencesService } from '../common/services/user-preferences.service';
import { ServicesComponent } from './services.component';

describe('ServicesComponent', () => {
  let component: ServicesComponent;
  let fixture: ComponentFixture<ServicesComponent>;

  // ServerInfo fields the component reads from getServerinfo()
  const serverInfoStub = { backup_stem: 'mybackup', default_language: 'de' };

  const mockServerApi = {
    getServerinfo: () => of(serverInfoStub),
    getShngServerStatus: () => of({ code: 20, text: 'running' }),
    restartShngServer: () => of({ result: 'ok' }),
    stopShngServer: jest.fn(() => of({ result: 'ok' })),
    poweroffHost: jest.fn((): Observable<unknown> => of({ result: 'ok' })),
    rebootHost: jest.fn((): Observable<unknown> => of({ result: 'ok' })),
    downloadConfigBackup: () => of(new Blob()),
  };

  const mockServicesApi = {
    getCacheOrphans: () => of(cacheFixture),
    deleteCacheFile: () => of({}),
    CheckYamlText: () => of('OK'),
    CheckEvalData: () => of({ expression: '', type: 'str', result: '' }),
    ConvertToYamlText: () => of(''),
  };

  const mockFilesApi = {
    saveFile: () => of(true),
  };

  const mockUserPrefs = {
    setLanguage: () => {},
  };

  let mockAppConfig: ReturnType<typeof createMockAppConfigService> & {
    restartStopsOnly: boolean;
    systemPowerAvailable: boolean;
  };

  beforeEach(async () => {
    mockAppConfig = {
      ...createMockAppConfigService(),
      restartStopsOnly: false,
      systemPowerAvailable: false,
    };
    mockServerApi.stopShngServer.mockClear();
    mockServerApi.poweroffHost.mockClear();
    mockServerApi.rebootHost.mockClear();
    await TestBed.configureTestingModule({
      imports: [ServicesComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ServicesApiService, useValue: mockServicesApi },
        { provide: FilesApiService, useValue: mockFilesApi },
        { provide: UserPreferencesService, useValue: mockUserPrefs },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: mockAppConfig },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ServicesComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load serverInfo with backup_stem from ServerApiService', () => {
    expect(component.serverInfo().backup_stem).toBe(serverInfoStub.backup_stem);
  });

  it('should populate cacheInfo from getCacheOrphans fixture', () => {
    expect(component.cacheInfo().length).toBe(cacheFixture.length);
  });

  it('should set the first cache entry filename correctly', () => {
    expect(component.cacheInfo()[0].filename).toBe(cacheFixture[0].filename);
  });

  it('should build valid_languagelist with 3 language options', () => {
    expect(component.valid_languagelist().length).toBe(3);
  });

  describe('stop core button', () => {
    const stopButton = () =>
      fixture.nativeElement.querySelector('#stop_shng') as HTMLButtonElement | null;

    it('is shown in daemon mode', () => {
      expect(stopButton()).not.toBeNull();
    });

    it('is hidden when restart can only stop (interactive/foreground/debug)', () => {
      mockAppConfig.restartStopsOnly = true;
      fixture = TestBed.createComponent(ServicesComponent);
      fixture.detectChanges();
      expect(stopButton()).toBeNull();
    });

    it('stops the core and marks the status as unknown on click', () => {
      stopButton()!.click();
      expect(mockServerApi.stopShngServer).toHaveBeenCalledTimes(1);
      expect(component.shng_statuscode()).toBe(-1);
    });
  });
  describe('host power row', () => {
    const button = (id: string) =>
      fixture.nativeElement.querySelector(`#${id}`) as HTMLButtonElement | null;

    const recreateWithPowerAvailable = () => {
      mockAppConfig.systemPowerAvailable = true;
      fixture = TestBed.createComponent(ServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('is hidden unless the server reports power actions as available', () => {
      expect(button('poweroff_host')).toBeNull();
      expect(button('reboot_host')).toBeNull();
    });

    it('shows both buttons when power actions are available', () => {
      recreateWithPowerAvailable();
      expect(button('poweroff_host')).not.toBeNull();
      expect(button('reboot_host')).not.toBeNull();
    });

    it('asks for confirmation on click without calling the API', () => {
      recreateWithPowerAvailable();
      button('poweroff_host')!.click();
      expect(component.pendingPowerAction()).toBe('poweroff');
      expect(mockServerApi.poweroffHost).not.toHaveBeenCalled();
    });

    it('powers off after confirmation', () => {
      recreateWithPowerAvailable();
      component.askPowerAction('poweroff');
      component.confirmPowerAction();
      expect(mockServerApi.poweroffHost).toHaveBeenCalledTimes(1);
      expect(component.pendingPowerAction()).toBeNull();
    });

    it('reboots after confirmation', () => {
      recreateWithPowerAvailable();
      component.askPowerAction('reboot');
      component.confirmPowerAction();
      expect(mockServerApi.rebootHost).toHaveBeenCalledTimes(1);
      expect(mockServerApi.poweroffHost).not.toHaveBeenCalled();
    });

    it('does nothing when the confirmation is cancelled', () => {
      recreateWithPowerAvailable();
      component.askPowerAction('reboot');
      component.cancelPowerAction();
      expect(component.pendingPowerAction()).toBeNull();
      expect(mockServerApi.rebootHost).not.toHaveBeenCalled();
    });

    it('shows the error text of a failed command', () => {
      recreateWithPowerAvailable();
      mockServerApi.poweroffHost.mockReturnValueOnce(
        of({ result: 'error', text: 'Interactive authentication required' }),
      );
      const add = jest.spyOn(TestBed.inject(MessageService), 'add');
      component.askPowerAction('poweroff');
      component.confirmPowerAction();
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: 'Interactive authentication required',
        }),
      );
      expect(component.shng_statuscode()).not.toBe(-1);
    });

    it('marks the status as unknown after a successful command', () => {
      recreateWithPowerAvailable();
      component.askPowerAction('poweroff');
      component.confirmPowerAction();
      expect(component.shng_statuscode()).toBe(-1);
    });
  });
});

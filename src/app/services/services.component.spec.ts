import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Observable, of, Subject } from 'rxjs';
import cacheFixture from '../../testing/fixtures/api/services/cachecheck/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../testing/test-helpers';
import {
  PullRepoCheck,
  PullRepoResult,
  PullResponse,
  PullStatusResponse,
} from '../common/models/server-pull';
import { AppConfigService } from '../common/services/app-config.service';
import { AuthService } from '../common/services/auth.service';
import { FilesApiService } from '../common/services/files-api.service';
import { ServerApiService } from '../common/services/server-api.service';
import { ServicesApiService } from '../common/services/services-api.service';
import { UserPreferencesService } from '../common/services/user-preferences.service';
import { ServicesComponent } from './services.component';

const pullRepo = (repo: PullRepoResult['repo'], changed: boolean): PullRepoResult => ({
  repo,
  status: 'ok',
  text: changed ? 'Updating a1b2c3..d4e5f6' : 'Already up to date.',
  changed,
  files: [],
});

const pullCheck = (
  repo: PullRepoCheck['repo'],
  state: PullRepoCheck['state'],
  behind = 0,
): PullRepoCheck => ({ repo, state, behind, ahead: 0, text: '' });

const pullStatus = (...repos: PullRepoCheck[]): PullStatusResponse => ({ result: 'ok', repos });

const pullResponse = (...repos: PullRepoResult[]): PullResponse => ({
  result: 'ok',
  repos,
  impact: { restart: repos.some((r) => r.changed) ? ['core: lib changed'] : [], reload: [] },
});

describe('ServicesComponent', () => {
  let component: ServicesComponent;
  let fixture: ComponentFixture<ServicesComponent>;

  // ServerInfo fields the component reads from getServerinfo()
  const serverInfoStub = { backup_stem: 'mybackup', default_language: 'de' };

  const mockServerApi = {
    getServerinfo: jest.fn((): Observable<unknown> => of(serverInfoStub)),
    getShngServerStatus: () => of({ code: 20, text: 'running' }),
    restartShngServer: () => of({ result: 'ok' }),
    stopShngServer: jest.fn(() => of({ result: 'ok' })),
    poweroffHost: jest.fn((): Observable<unknown> => of({ result: 'ok' })),
    rebootHost: jest.fn((): Observable<unknown> => of({ result: 'ok' })),
    getPullStatus: jest.fn((): Observable<unknown> => of(pullStatus())),
    pullCore: jest.fn((): Observable<unknown> => of(pullResponse(pullRepo('core', true)))),
    pullPlugins: jest.fn((): Observable<unknown> => of(pullResponse(pullRepo('plugins', true)))),
    pullAll: jest.fn(
      (): Observable<unknown> =>
        of(pullResponse(pullRepo('core', true), pullRepo('plugins', true))),
    ),
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
    corePullAvailable: boolean;
    pluginsPullAvailable: boolean;
  };

  beforeEach(async () => {
    mockAppConfig = {
      ...createMockAppConfigService(),
      restartStopsOnly: false,
      systemPowerAvailable: false,
      corePullAvailable: false,
      pluginsPullAvailable: false,
    };
    mockServerApi.getPullStatus.mockClear();
    mockServerApi.pullCore.mockClear();
    mockServerApi.pullPlugins.mockClear();
    mockServerApi.pullAll.mockClear();
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

  describe('pull row', () => {
    const button = (id: string) =>
      fixture.nativeElement.querySelector(`#${id}`) as HTMLButtonElement | null;

    const recreateWithPullAvailable = (core: boolean, plugins: boolean) => {
      mockAppConfig.corePullAvailable = core;
      mockAppConfig.pluginsPullAvailable = plugins;
      fixture = TestBed.createComponent(ServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('refresh re-reads the server info, so branch and availability follow the checkouts', () => {
      recreateWithPullAvailable(true, false);
      expect(button('pull_plugins')!.disabled).toBe(true);
      mockServerApi.getServerinfo.mockImplementationOnce(() => {
        mockAppConfig.pluginsPullAvailable = true;
        return of(serverInfoStub);
      });
      mockServerApi.getPullStatus.mockClear();

      button('pull_refresh')!.click();
      fixture.detectChanges();

      expect(mockServerApi.getPullStatus).toHaveBeenCalledTimes(1);
      expect(button('pull_plugins')!.disabled).toBe(false);
    });

    it('is hidden unless the server reports a pullable checkout', () => {
      expect(button('pull_core')).toBeNull();
      expect(button('pull_plugins')).toBeNull();
      expect(button('pull_all')).toBeNull();
    });

    it('enables only the buttons whose checkouts can be pulled', () => {
      recreateWithPullAvailable(true, false);
      expect(button('pull_core')!.disabled).toBe(false);
      expect(button('pull_plugins')!.disabled).toBe(true);
      expect(button('pull_all')!.disabled).toBe(true);
    });

    it('enables pull all if both checkouts can be pulled', () => {
      recreateWithPullAvailable(true, true);
      expect(button('pull_all')!.disabled).toBe(false);
    });

    it.each([
      ['pull_core', 'pullCore'],
      ['pull_plugins', 'pullPlugins'],
      ['pull_all', 'pullAll'],
    ] as const)('%s calls only %s', (id, method) => {
      recreateWithPullAvailable(true, true);
      button(id)!.click();
      for (const m of ['pullCore', 'pullPlugins', 'pullAll'] as const) {
        expect(mockServerApi[m]).toHaveBeenCalledTimes(m === method ? 1 : 0);
      }
    });

    it('shows the per-repository result and a restart hint if a checkout changed', () => {
      recreateWithPullAvailable(true, true);
      button('pull_all')!.click();
      fixture.detectChanges();
      expect(component.pullResult()!.repos.map((r) => r.repo)).toEqual(['core', 'plugins']);
      expect(fixture.nativeElement.querySelector('#pull_restart_hint')).not.toBeNull();
    });

    it('shows no restart hint if nothing changed', () => {
      recreateWithPullAvailable(true, true);
      mockServerApi.pullCore.mockReturnValueOnce(of(pullResponse(pullRepo('core', false))));
      button('pull_core')!.click();
      fixture.detectChanges();
      expect(component.pullResult()).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#pull_restart_hint')).toBeNull();
    });

    describe('result per repository', () => {
      const pluginsPulled = (files: string[], status: PullRepoResult['status'] = 'ok') =>
        of({
          result: 'ok',
          repos: [{ ...pullRepo('plugins', true), files, status }],
          impact: { restart: [], reload: [] },
        } as PullResponse);

      const show = (response: ReturnType<typeof pluginsPulled>) => {
        recreateWithPullAvailable(true, true);
        mockServerApi.pullPlugins.mockReturnValueOnce(response);
        button('pull_plugins')!.click();
        fixture.detectChanges();
      };

      it('lists the updated plugins once each, without files outside a plugin directory', () => {
        show(
          pluginsPulled([
            '__init__.py',
            'hue2/__init__.py',
            'hue2/webif/__init__.py',
            'mqtt2/plugin.yaml',
          ]),
        );
        expect(component.updatedAreas(component.pullResult()!.repos[0])).toEqual(['hue2', 'mqtt2']);
        expect(fixture.nativeElement.querySelector('.pull-updated').textContent).toContain(
          'hue2, mqtt2',
        );
      });

      it('keeps the raw git output in a container that is collapsed after a successful pull', () => {
        show(pluginsPulled(['hue2/__init__.py']));
        const details = fixture.nativeElement.querySelector(
          'details.pull-raw',
        ) as HTMLDetailsElement;
        expect(details).not.toBeNull();
        expect(details.open).toBe(false);
        expect(details.querySelector('pre')!.textContent).toContain('Updating a1b2c3..d4e5f6');
      });

      it('opens the raw output if the repository was not pulled', () => {
        show(pluginsPulled([], 'error'));
        expect(
          (fixture.nativeElement.querySelector('details.pull-raw') as HTMLDetailsElement).open,
        ).toBe(true);
      });
    });

    it('names the reasons for the restart', () => {
      recreateWithPullAvailable(true, true);
      button('pull_all')!.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#pull_restart_hint').textContent).toContain(
        'core: lib changed',
      );
    });

    describe('when only plugins need a reload', () => {
      const reloadResponse: PullResponse = {
        result: 'ok',
        repos: [pullRepo('plugins', true)],
        impact: { restart: [], reload: ['hue_a', 'hue_b'] },
      };

      beforeEach(() => {
        recreateWithPullAvailable(true, true);
        mockServerApi.pullPlugins.mockReturnValueOnce(of(reloadResponse));
        button('pull_plugins')!.click();
        fixture.detectChanges();
      });

      it('shows the plugins instead of a restart hint', () => {
        expect(fixture.nativeElement.querySelector('#pull_restart_hint')).toBeNull();
        expect(fixture.nativeElement.querySelector('#pull_reload_hint')).not.toBeNull();
        expect(component.pullReloadPlugins()).toEqual(['hue_a', 'hue_b']);
      });

      it('showPluginsToReload() closes the result and opens the plugin configuration', () => {
        const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        component.showPluginsToReload();
        expect(navigate).toHaveBeenCalledWith(['/plugins/config']);
        expect(component.pullResult()).toBeNull();
      });
    });

    it('says so if the changes need neither a restart nor a reload', () => {
      recreateWithPullAvailable(true, true);
      mockServerApi.pullPlugins.mockReturnValueOnce(
        of({
          result: 'ok',
          repos: [pullRepo('plugins', true)],
          impact: { restart: [], reload: [] },
        } as PullResponse),
      );
      button('pull_plugins')!.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#pull_nothing_needed_hint')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#pull_restart_hint')).toBeNull();
    });

    it('keeps the restart hint when a later checkout failed after an earlier one changed', () => {
      recreateWithPullAvailable(true, true);
      mockServerApi.pullAll.mockReturnValueOnce(
        of({
          result: 'error',
          repos: [
            pullRepo('core', true),
            {
              repo: 'plugins',
              status: 'error',
              text: 'fatal: Not possible',
              changed: false,
              files: [],
            },
          ],
          impact: { restart: ['core: lib changed'], reload: [] },
        }),
      );
      button('pull_all')!.click();
      fixture.detectChanges();
      expect(component.pullResult()!.result).toBe('error');
      expect(fixture.nativeElement.querySelector('#pull_restart_hint')).not.toBeNull();
    });

    it('reports a refused request as an error result', () => {
      recreateWithPullAvailable(true, true);
      mockServerApi.pullCore.mockReturnValueOnce(
        of({ result: 'error', text: 'A pull is already running', repos: [] }),
      );
      button('pull_core')!.click();
      expect(component.pullResult()).toEqual({
        result: 'error',
        text: 'A pull is already running',
        repos: [],
      });
    });

    it('reports a failed request (no usable response) as an error result', () => {
      recreateWithPullAvailable(true, true);
      mockServerApi.pullCore.mockReturnValueOnce(of({}));
      button('pull_core')!.click();
      expect(component.pullResult()!.result).toBe('error');
      expect(component.pullResult()!.repos).toEqual([]);
      expect(component.pullResult()!.text).toBeTruthy();
    });

    it('disables the buttons while a pull is running', () => {
      recreateWithPullAvailable(true, true);
      const pending = new Subject<unknown>();
      mockServerApi.pullCore.mockReturnValueOnce(pending);
      button('pull_core')!.click();
      fixture.detectChanges();
      expect(button('pull_core')!.disabled).toBe(true);
      expect(button('pull_all')!.disabled).toBe(true);
      pending.next(pullResponse(pullRepo('core', true)));
      pending.complete();
      fixture.detectChanges();
      expect(button('pull_core')!.disabled).toBe(false);
    });

    it('closes the result', () => {
      recreateWithPullAvailable(true, true);
      button('pull_core')!.click();
      component.closePullResult();
      expect(component.pullResult()).toBeNull();
    });
  });

  describe('pull status', () => {
    const button = (id: string) =>
      fixture.nativeElement.querySelector(`#${id}`) as HTMLButtonElement | null;

    const recreateWithPullAvailable = (
      core: boolean,
      plugins: boolean,
      status: Observable<unknown> = of(pullStatus()),
    ) => {
      mockAppConfig.corePullAvailable = core;
      mockAppConfig.pluginsPullAvailable = plugins;
      mockServerApi.getPullStatus.mockReturnValueOnce(status);
      fixture = TestBed.createComponent(ServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('is not requested if no checkout can be pulled', () => {
      expect(mockServerApi.getPullStatus).not.toHaveBeenCalled();
    });

    it('is requested once when the page opens', () => {
      recreateWithPullAvailable(true, true);
      expect(mockServerApi.getPullStatus).toHaveBeenCalledTimes(1);
    });

    it('is stored per checkout', () => {
      recreateWithPullAvailable(
        true,
        true,
        of(pullStatus(pullCheck('core', 'behind', 3), pullCheck('plugins', 'current'))),
      );
      expect(component.pullStateOf('core')).toBe('behind');
      expect(component.pullStateOf('plugins')).toBe('current');
      expect(component.pullStatusPending()).toBe(false);
    });

    it('reports a checkout without upstream as such, without asking the server', () => {
      recreateWithPullAvailable(true, false);
      expect(component.pullStateOf('plugins')).toBe('no_upstream');
    });

    it('leaves the state unknown if the status request failed', () => {
      recreateWithPullAvailable(true, true, of({}));
      expect(component.pullStateOf('core')).toBeUndefined();
      expect(component.pullStatusPending()).toBe(false);
    });

    it('keeps the buttons usable while the status is still being fetched', () => {
      recreateWithPullAvailable(true, true, new Subject<unknown>());
      expect(component.pullStatusPending()).toBe(true);
      expect(button('pull_core')!.disabled).toBe(false);
      expect(button('pull_plugins')!.disabled).toBe(false);
      expect(button('pull_all')!.disabled).toBe(false);
    });

    it('keeps the buttons usable if the status request failed', () => {
      recreateWithPullAvailable(true, true, of({}));
      expect(button('pull_core')!.disabled).toBe(false);
      expect(button('pull_all')!.disabled).toBe(false);
    });

    it('disables the button of a checkout that is up to date', () => {
      recreateWithPullAvailable(
        true,
        true,
        of(pullStatus(pullCheck('core', 'current'), pullCheck('plugins', 'behind', 2))),
      );
      expect(button('pull_core')!.disabled).toBe(true);
      expect(button('pull_plugins')!.disabled).toBe(false);
      expect(button('pull_all')!.disabled).toBe(false);
    });

    it('disables the button of a checkout that is only ahead of its upstream', () => {
      recreateWithPullAvailable(
        true,
        true,
        of(pullStatus(pullCheck('core', 'ahead'), pullCheck('plugins', 'behind', 1))),
      );
      expect(button('pull_core')!.disabled).toBe(true);
      expect(button('pull_all')!.disabled).toBe(false);
    });

    it('disables pull all if nothing is behind', () => {
      recreateWithPullAvailable(
        true,
        true,
        of(pullStatus(pullCheck('core', 'current'), pullCheck('plugins', 'current'))),
      );
      expect(button('pull_all')!.disabled).toBe(true);
    });

    it.each(['diverged', 'blocked'] as const)(
      'disables the button of a %s checkout and pull all',
      (state) => {
        recreateWithPullAvailable(
          true,
          true,
          of(pullStatus(pullCheck('core', 'behind', 1), pullCheck('plugins', state, 1))),
        );
        expect(button('pull_core')!.disabled).toBe(false);
        expect(button('pull_plugins')!.disabled).toBe(true);
        expect(button('pull_all')!.disabled).toBe(true);
      },
    );

    it('is requested again by the refresh button', () => {
      recreateWithPullAvailable(true, true);
      button('pull_refresh')!.click();
      expect(mockServerApi.getPullStatus).toHaveBeenCalledTimes(2);
    });

    it('cannot be refreshed while it is being fetched', () => {
      recreateWithPullAvailable(true, true, new Subject<unknown>());
      expect(button('pull_refresh')!.disabled).toBe(true);
    });

    it('is requested again after a pull', () => {
      recreateWithPullAvailable(true, true);
      button('pull_core')!.click();
      expect(mockServerApi.getPullStatus).toHaveBeenCalledTimes(2);
    });
  });
});

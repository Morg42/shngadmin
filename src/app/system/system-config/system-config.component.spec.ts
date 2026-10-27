import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/config/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ConfigApiService } from '../../common/services/config-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';
import { SharedService } from '../../common/services/shared.service';
import { SystemConfigComponent } from './system-config.component';

describe('SystemConfigComponent', () => {
  let component: SystemConfigComponent;
  let fixture: ComponentFixture<SystemConfigComponent>;

  const commonParamCount = Object.keys(fixtureData.common.meta.parameters).length;

  const mockConfigApi = {
    getConfig: () => of(fixtureData),
    saveConfig: () => of(true),
    checkConfigEtc: () =>
      of({
        result: 'ok',
        already_enabled: false,
        safe: true,
        conflicts: {},
        to_migrate: {},
        already_done: [],
        not_present: [],
      }),
  };

  const mockServerApi = {
    restartShngServer: () => of({ result: 'ok' }),
    getServerinfo: jest.fn(() => of({})),
  };

  const mockServicesApi = {
    hashPassword: jest.fn((pw: string) => of('hash-of-' + pw)),
    checkPassword: jest.fn((pw: string, hash: string) => of(hash === 'hash-of-' + pw)),
  };

  const mockSharedService = {
    setGuiLanguage: () => {},
    getDescription: (d: any) => (d ? (d['en'] ?? d['de'] ?? '') : ''),
    getFallbackLanguage: () => 'en',
    mdLiteToHtml: SharedService.prototype.mdLiteToHtml,
    is_knx_groupaddress: () => true,
    is_mac: () => true,
    is_ipv4: () => true,
    is_ipv6: () => true,
    is_hostname: () => true,
  };

  beforeEach(async () => {
    mockServerApi.getServerinfo.mockClear();
    await TestBed.configureTestingModule({
      imports: [SystemConfigComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigApiService, useValue: mockConfigApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ServicesApiService, useValue: mockServicesApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SystemConfigComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SystemConfigComponent);
    component = fixture.componentInstance;
    (component as any).shared = mockSharedService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate common_parameters from fixture', () => {
    expect(component.common_parameters().length).toBe(commonParamCount);
  });

  it('should populate config with all fixture sections', () => {
    expect(component.config()).toBeTruthy();
    expect(component.config()!.common).toBeDefined();
    expect(component.config()!.http).toBeDefined();
    expect(component.config()!.websocket).toBeDefined();
    expect(component.config()!.admin).toBeDefined();
    expect(component.config()!.mqtt).toBeDefined();
  });

  it('should set data_changed to false initially', () => {
    expect(component.data_changed()).toBe(false);
  });

  it('should set the first common parameter name correctly from fixture', () => {
    const firstParamName = Object.keys(fixtureData.common.meta.parameters)[0];
    expect(component.common_parameters()[0].name).toBe(firstParamName);
  });

  // -------------------------------------------------------------------------
  // check_value_restrictions() - delegates to the shared validateValue(),
  // these confirm the delegation preserves the dialog/log side effects the
  // old hand-rolled version had.
  // -------------------------------------------------------------------------

  describe('fillParamData', () => {
    it('renders the parameter description through the shared mini-markdown', () => {
      const meta = {
        parameters: { p: { type: 'str', description: { en: 'line one\nline **two** end' } } },
      };
      const paramdata = component.fillParamData(meta, 'p', { p: 'x' });
      expect(paramdata.desc).toBe('line one<br>line <b><mark>two</mark></b> end');
    });

    it('yields an empty description when the parameter has none', () => {
      const paramdata = component.fillParamData({ parameters: { p: { type: 'str' } } }, 'p', {});
      expect(paramdata.desc).toBe('');
    });
  });

  describe('check_value_restrictions', () => {
    it('passes a well-formed value and touches nothing', () => {
      component.validation_dialog_text = [];
      const ok = component.check_value_restrictions({ name: 'p', type: 'str', value: 'x' });
      expect(ok).toBe(true);
      expect(component.validation_dialog_display).toBe(false);
      expect(component.validation_dialog_text).toEqual([]);
    });

    it('flags a value below valid_min, opens the validation dialog with the parameter name', () => {
      component.validation_dialog_text = [];
      component.validation_dialog_display = false;
      const ok = component.check_value_restrictions({
        name: 'my_param',
        type: 'int',
        value: 5,
        valid_min: 10,
      });
      expect(ok).toBe(false);
      expect(component.validation_dialog_display).toBe(true);
      expect(component.validation_dialog_parameter).toBe('my_param');
      expect(component.validation_dialog_text[0]).toContain('my_param');
    });

    it('flags a bad format value using SharedService through the shared validators', () => {
      (component as any).shared = { ...mockSharedService, is_mac: () => false };
      component.validation_dialog_text = [];
      const ok = component.check_value_restrictions({ name: 'p', type: 'mac', value: 'zz' });
      expect(ok).toBe(false);
    });

    it('flags a missing mandatory value', () => {
      component.validation_dialog_text = [];
      const ok = component.check_value_restrictions({
        name: 'p',
        type: 'str',
        value: '',
        mandatory: true,
      });
      expect(ok).toBe(false);
    });
  });
  describe('saveSettings: live options', () => {
    const param = (name: string) => component.common_parameters().find((p) => p.name === name)!;

    it('does not offer a restart when only live options changed', () => {
      param('deprecated_warnings').value = true;
      component.saveSettings();
      expect(component.restart_core_button()).toBe(false);
    });

    it('offers a restart when an option that is not live changed', () => {
      param('tz').value = 'Europe/Vienna';
      component.saveSettings();
      expect(component.restart_core_button()).toBe(true);
    });

    it('offers a restart when live and non-live options changed together', () => {
      param('deprecated_warnings').value = true;
      param('tz').value = 'Europe/Vienna';
      component.saveSettings();
      expect(component.restart_core_button()).toBe(true);
    });

    it('offers a restart when an option of another section changed', () => {
      component.http_parameters()[0].value = 'changed';
      component.saveSettings();
      expect(component.restart_core_button()).toBe(true);
    });

    it('reloads the server info so live options reach the UI', () => {
      param('deprecated_warnings').value = true;
      component.saveSettings();
      expect(mockServerApi.getServerinfo).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // change_password() - old password check and new hash come from the backend
  // -------------------------------------------------------------------------

  describe('change_password', () => {
    let row: Record<string, unknown>;

    beforeEach(() => {
      row = { value: 'hash-of-old' };
      component.change_password_dialog(null, row as any, 'value');
    });

    it('stores the backend hash of the new password', () => {
      component.pwd_old = 'old';
      component.pwd_new1 = 'new';
      component.pwd_new2 = 'new';

      component.change_password(null);

      expect(row['value']).toBe('hash-of-new');
      expect(component.pwd_change_dialog_display).toBe(false);
    });

    it('rejects a wrong old password', () => {
      component.pwd_old = 'wrong';
      component.pwd_new1 = 'new';
      component.pwd_new2 = 'new';

      component.change_password(null);

      expect(component.pwd_old_is_wrong).toBe(true);
      expect(row['value']).toBe('hash-of-old');
    });

    it('rejects different new passwords', () => {
      component.pwd_old = 'old';
      component.pwd_new1 = 'new';
      component.pwd_new2 = 'other';

      component.change_password(null);

      expect(component.pwd_new_not_identical).toBe(true);
      expect(row['value']).toBe('hash-of-old');
    });

    it('an empty new password removes the hash', () => {
      component.pwd_old = 'old';
      component.pwd_new1 = null;
      component.pwd_new2 = null;

      component.change_password(null);

      expect(row['value']).toBeNull();
    });
  });
});

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
import { SystemConfigComponent } from './system-config.component';

describe('SystemConfigComponent', () => {
  let component: SystemConfigComponent;
  let fixture: ComponentFixture<SystemConfigComponent>;

  const commonParamCount = Object.keys(fixtureData.common.meta.parameters).length;

  const mockConfigApi = {
    getConfig: () => of(fixtureData),
    saveConfig: () => of(true),
  };

  const mockServerApi = {
    restartShngServer: () => of({ result: 'ok' }),
  };

  const mockSharedService = {
    setGuiLanguage: () => {},
    getDescription: (d: any) => (d ? (d['en'] ?? d['de'] ?? '') : ''),
    getFallbackLanguage: () => 'en',
    is_knx_groupaddress: () => true,
    is_mac: () => true,
    is_ipv4: () => true,
    is_ipv6: () => true,
    is_hostname: () => true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemConfigComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigApiService, useValue: mockConfigApi },
        { provide: ServerApiService, useValue: mockServerApi },
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
    expect(component.common_parameters.length).toBe(commonParamCount);
  });

  it('should populate config with all fixture sections', () => {
    expect(component.config).toBeTruthy();
    expect(component.config.common).toBeDefined();
    expect(component.config.http).toBeDefined();
    expect(component.config.websocket).toBeDefined();
    expect(component.config.admin).toBeDefined();
    expect(component.config.mqtt).toBeDefined();
  });

  it('should set data_changed to false initially', () => {
    expect(component.data_changed).toBe(false);
  });

  it('should set the first common parameter name correctly from fixture', () => {
    const firstParamName = Object.keys(fixtureData.common.meta.parameters)[0];
    expect(component.common_parameters[0].name).toBe(firstParamName);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, Renderer2 } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/plugins/config/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { UserPreferencesService } from '../../common/services/user-preferences.service';
import { PluginConfigComponent } from './plugin-config.component';

describe('PluginConfigComponent', () => {
  let component: PluginConfigComponent;
  let fixture: ComponentFixture<PluginConfigComponent>;

  const pluginConfigKeys = Object.keys(fixtureData.plugin_config);

  const mockPluginsApi = {
    getPluginsConfig: () => of(fixtureData),
    setPluginConfig: () => of(true),
    setPluginState: () => of(true),
    getInstalledPlugins: () => of({}),
    addPluginConfig: () => of(true),
    deletePluginConfig: () => of(true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PluginConfigComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        // AppComponent is declared as a component provider and injects these
        {
          provide: ServerApiService,
          useValue: { getServerBasicinfo: () => of({}), getServerinfo: () => of({}) },
        },
        {
          provide: UserPreferencesService,
          useValue: { setLanguage: () => {}, getLanguage: () => null },
        },
        Renderer2,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(PluginConfigComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PluginConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set spinner_display to false after loading', () => {
    // finalize() from reloadPluginList sets spinner_display=false synchronously
    expect(component.spinner_display).toBe(false);
  });

  it('should set pluginconflist from fixture data', () => {
    // pluginconflist is populated in the subscribe callback
    expect(component.pluginconflist).toBeTruthy();
    expect(component.pluginconflist.readonly).toBe(fixtureData.readonly);
  });

  it('should set up cols with 6 column definitions', () => {
    // cols is set in ngOnInit after reloadPluginList
    expect(component.cols.length).toBe(6);
  });
});

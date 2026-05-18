import { UpperCasePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/plugins/info/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { PluginsComponent } from './plugins.component';

describe('PluginsComponent', () => {
  let component: PluginsComponent;
  let fixture: ComponentFixture<PluginsComponent>;

  const mockPluginsApi = {
    getPluginsInfo: () => of(fixtureData),
    setPluginState: () => of({}),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PluginsComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(PluginsComponent, {
        set: { imports: [TranslatePipe, UpperCasePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PluginsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate plugininfo with all plugins from fixture', () => {
    expect(component.plugininfo.length).toBe(fixtureData.length);
  });

  it('should set loading to false after data arrives', () => {
    expect(component.loading).toBe(false);
  });

  it('should render one tbody row per plugin', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(fixtureData.length);
  });

  it('should sort plugins by pluginname+configname', () => {
    // after sort, check first plugin matches alphabetically first entry
    const sorted = [...fixtureData].sort((a, b) => {
      const ka = a.pluginname + a.configname.toLowerCase();
      const kb = b.pluginname + b.configname.toLowerCase();
      return ka > kb ? 1 : kb > ka ? -1 : 0;
    });
    expect(component.plugininfo[0].configname).toBe(sorted[0].configname);
  });
});

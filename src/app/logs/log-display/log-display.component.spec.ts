import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/logs/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { LogsApiService } from '../../common/services/logs-api.service';
import { LogDisplayComponent } from './log-display.component';

describe('LogDisplayComponent', () => {
  let component: LogDisplayComponent;
  let fixture: ComponentFixture<LogDisplayComponent>;

  const logNames = Object.keys(fixtureData.logs);

  const mockLogsApi = {
    getLogs: () => of(fixtureData),
    readLogfile: () =>
      of({ lines: [1], loglines: ['sample log line\n'], lastchunk: true, chunk: 1 }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogDisplayComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                params: {},
                get: (_key: string) => null,
              },
            },
            params: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LogDisplayComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LogDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate logs_info with all logs from fixture', () => {
    expect(Object.keys(component.logs_info).length).toBe(logNames.length);
  });

  it('should build logs dropdown with one entry per log in fixture', () => {
    expect(component.logs.length).toBe(logNames.length);
  });

  it('should set default_log from fixture', () => {
    expect(component.default_log).toBe(fixtureData.default);
  });

  it('should select the default log from fixture on init', () => {
    // fixture default is 'smarthome-warnings' which exists in the fixture logs
    expect(component.selectedLog).toBe(fixtureData.default);
  });
});

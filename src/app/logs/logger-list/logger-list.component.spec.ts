import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/loggers/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { LoggersApiService } from '../../common/services/loggers-api.service';
import { LoggerListComponent } from './logger-list.component';

describe('LoggerListComponent', () => {
  let component: LoggerListComponent;
  let fixture: ComponentFixture<LoggerListComponent>;

  const loggerNames = Object.keys(fixtureData.loggers).sort();

  const mockLoggersApi = {
    getLoggers: () => of(fixtureData),
    setLoggerLevel: () => of({ result: 'ok' }),
    addLogger: () => of({ result: 'ok' }),
    deleteLogger: () => of({ result: 'ok' }),
    setHandlers: () => of({ result: 'ok' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggerListComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoggersApiService, useValue: mockLoggersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LoggerListComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LoggerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate loggersList with all logger keys sorted', () => {
    expect(component.loggersList.length).toBe(loggerNames.length);
    expect(component.loggersList[0]).toBe(loggerNames[0]);
  });

  it('should populate active_plugins from fixture', () => {
    expect(component.active_plugins.length).toBe(fixtureData.active_plugins.length);
  });

  it('should populate active_logics from fixture', () => {
    expect(component.active_logics.length).toBe(fixtureData.active_logics.length);
  });

  it('should populate definedHandlers from fixture', () => {
    expect(component.definedHandlers.length).toBe(fixtureData.defined_handlers.length);
  });
});

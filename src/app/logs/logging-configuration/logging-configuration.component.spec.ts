import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { FilesApiService } from '../../common/services/files-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';
import { LoggingConfigurationComponent } from './logging-configuration.component';

// The fixture is plain text (a YAML file)
const loggingFixtureText = `%YAML 1.1
---
version: 1
disable_existing_loggers: false
`;

describe('LoggingConfigurationComponent', () => {
  let component: LoggingConfigurationComponent;
  let fixture: ComponentFixture<LoggingConfigurationComponent>;

  const mockFilesApi = {
    readFile: () => of(loggingFixtureText),
    saveFile: () => of(true),
  };

  const mockServicesApi = {
    CheckYamlText: () => of('OK'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggingConfigurationComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FilesApiService, useValue: mockFilesApi },
        { provide: ServicesApiService, useValue: mockServicesApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LoggingConfigurationComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LoggingConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the logging file content into myTextarea', () => {
    expect(component.myTextarea).toBe(loggingFixtureText);
  });

  it('should keep myTextareaOrig in sync with loaded content', () => {
    expect(component.myTextareaOrig).toBe(loggingFixtureText);
  });

  it('should set myEditFilename to "logging"', () => {
    expect(component.myEditFilename).toBe('logging');
  });

  it('should contain YAML version header in loaded content', () => {
    expect(component.myTextarea).toContain('version: 1');
  });
});

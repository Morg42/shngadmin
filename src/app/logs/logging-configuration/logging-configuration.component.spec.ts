import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { LoggingConfigurationComponent } from './logging-configuration.component';
import { ServerApiService } from '../../common/services/server-api.service';
import { AuthService } from '../../common/services/auth.service';
import { AppConfigService } from '../../common/services/app-config.service';
import { TranslatePipe } from '@ngx-translate/core';
import {translateTestingModule, 
  createMockAuthService,
  createMockAppConfigService} from '../../../testing/test-helpers';

describe('LoggingConfigurationComponent', () => {
  let component: LoggingConfigurationComponent;
  let fixture: ComponentFixture<LoggingConfigurationComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [
        LoggingConfigurationComponent,
        translateTestingModule,
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(LoggingConfigurationComponent, { set: { imports: [TranslatePipe] } })
    .compileComponents();

    fixture = TestBed.createComponent(LoggingConfigurationComponent);
    component = fixture.componentInstance;
    (component as any).codeEditor = { codeMirror: { getOption: jest.fn(() => false), setSize: jest.fn(), refresh: jest.fn(), state: { completionActive: false } } };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

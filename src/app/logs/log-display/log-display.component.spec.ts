import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { LogDisplayComponent } from './log-display.component';

describe('LogDisplayComponent', () => {
  let component: LogDisplayComponent;
  let fixture: ComponentFixture<LogDisplayComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [LogDisplayComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                params: { logname: undefined },
                get: (_key: string) => null,
              },
            },
            params: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LogDisplayComponent, { set: { imports: [TranslatePipe] } })
      .compileComponents();

    fixture = TestBed.createComponent(LogDisplayComponent);
    component = fixture.componentInstance;
    (component as any).codeEditor = {
      codeMirror: {
        getOption: jest.fn(() => false),
        setSize: jest.fn(),
        refresh: jest.fn(),
        state: { completionActive: false },
      },
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

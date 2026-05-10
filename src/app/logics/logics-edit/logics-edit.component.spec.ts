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
import { LogicsEditComponent } from './logics-edit.component';

describe('LogicsEditComponent', () => {
  let component: LogicsEditComponent;
  let fixture: ComponentFixture<LogicsEditComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [LogicsEditComponent, translateTestingModule],
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
                params: { logicname: 'testlogic|testfile' },
                get: (key: string) => (key === 'logicname' ? 'testlogic|testfile' : null),
              },
            },
            params: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LogicsEditComponent, { set: { imports: [TranslatePipe] } })
      .compileComponents();

    fixture = TestBed.createComponent(LogicsEditComponent);
    component = fixture.componentInstance;
    const cmStub = {
      getOption: jest.fn(() => false),
      setSize: jest.fn(),
      refresh: jest.fn(),
      state: { completionActive: false },
      on: jest.fn(),
    };
    (component as any).codeEditor = { codeMirror: cmStub };
    (component as any).codeEditorWatchItems = { codeMirror: cmStub };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

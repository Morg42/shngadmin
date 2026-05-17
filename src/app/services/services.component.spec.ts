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
} from '../../testing/test-helpers';
import { AppConfigService } from '../common/services/app-config.service';
import { AuthService } from '../common/services/auth.service';
import { ServerApiService } from '../common/services/server-api.service';
import { ServicesComponent } from './services.component';

describe('ServicesComponent', () => {
  let component: ServicesComponent;
  let fixture: ComponentFixture<ServicesComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      getShngServerStatus: () => of({ code: 20, text: 'running' }),
      restartShngServer: () => of({ result: 'ok' }),
      downloadConfigBackup: () => of(new Blob()),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [ServicesComponent, translateTestingModule],
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
      .overrideComponent(ServicesComponent, { set: { imports: [TranslatePipe] } })
      .compileComponents();

    fixture = TestBed.createComponent(ServicesComponent);
    component = fixture.componentInstance;
    const cmStub = {
      getOption: jest.fn(() => false),
      setSize: jest.fn(),
      refresh: jest.fn(),
      state: { completionActive: false },
      on: jest.fn(),
    };
    (component as any).evalCodeEditor = { codeMirror: cmStub };
    (component as any).evalCodeEditor2 = { codeMirror: cmStub };
    (component as any).codeEditor = { codeMirror: cmStub };
    (component as any).codeEditor2 = { codeMirror: cmStub };
    (component as any).converterCodeEditor = { codeMirror: cmStub };
    (component as any).converterCodeEditor2 = { codeMirror: cmStub };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

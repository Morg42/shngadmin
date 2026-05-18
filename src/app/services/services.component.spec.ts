import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import cacheFixture from '../../testing/fixtures/api/services/cachecheck/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../testing/test-helpers';
import { AppConfigService } from '../common/services/app-config.service';
import { AuthService } from '../common/services/auth.service';
import { FilesApiService } from '../common/services/files-api.service';
import { ServerApiService } from '../common/services/server-api.service';
import { ServicesApiService } from '../common/services/services-api.service';
import { UserPreferencesService } from '../common/services/user-preferences.service';
import { ServicesComponent } from './services.component';

describe('ServicesComponent', () => {
  let component: ServicesComponent;
  let fixture: ComponentFixture<ServicesComponent>;

  // ServerInfo fields the component reads from getServerinfo()
  const serverInfoStub = { backup_stem: 'mybackup', default_language: 'de' };

  const mockServerApi = {
    getServerinfo: () => of(serverInfoStub),
    getShngServerStatus: () => of({ code: 20, text: 'running' }),
    restartShngServer: () => of({ result: 'ok' }),
    downloadConfigBackup: () => of(new Blob()),
  };

  const mockServicesApi = {
    getCacheOrphans: () => of(cacheFixture),
    deleteCacheFile: () => of({}),
    CheckYamlText: () => of('OK'),
    CheckEvalData: () => of({ expression: '', type: 'str', result: '' }),
    ConvertToYamlText: () => of(''),
  };

  const mockFilesApi = {
    saveFile: () => of(true),
  };

  const mockUserPrefs = {
    setLanguage: () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ServicesApiService, useValue: mockServicesApi },
        { provide: FilesApiService, useValue: mockFilesApi },
        { provide: UserPreferencesService, useValue: mockUserPrefs },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ServicesComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load serverInfo with backup_stem from ServerApiService', () => {
    expect(component.serverInfo.backup_stem).toBe(serverInfoStub.backup_stem);
  });

  it('should populate cacheInfo from getCacheOrphans fixture', () => {
    expect(component.cacheInfo.length).toBe(cacheFixture.length);
  });

  it('should set the first cache entry filename correctly', () => {
    expect(component.cacheInfo[0].filename).toBe(cacheFixture[0].filename);
  });

  it('should build valid_languagelist with 3 language options', () => {
    expect(component.valid_languagelist.length).toBe(3);
  });
});

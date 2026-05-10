import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LogicsApiService } from './logics-api.service';
import { AppConfigService } from './app-config.service';
import { createMockAppConfigService } from '../../../testing/test-helpers';

describe('LogicsApiService', () => {
  let service: LogicsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        LogicsApiService,
      ],
    });
    service = TestBed.inject(LogicsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getLogics() sends a GET to /api/logics/', () => {
    service.getLogics().subscribe();
    const req = http.expectOne('/api/logics/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getGroupsInfo() sends a GET to /api/logics/ with infotype=groups', () => {
    service.getGroupsInfo().subscribe();
    const req = http.expectOne(r => r.url.includes('logics') && r.url.includes('infotype=groups'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});

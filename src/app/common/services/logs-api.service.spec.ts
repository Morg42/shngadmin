import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LogsApiService } from './logs-api.service';
import { AppConfigService } from './app-config.service';
import { ServerApiService } from './server-api.service';
import { createMockAppConfigService, createMockServerApiService } from '../../../testing/test-helpers';

describe('LogsApiService', () => {
  let service: LogsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: ServerApiService, useValue: createMockServerApiService() },
        LogsApiService,
      ],
    });
    service = TestBed.inject(LogsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getLogs() sends a GET to /api/logs/', () => {
    service.getLogs().subscribe();
    const req = http.expectOne('/api/logs/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

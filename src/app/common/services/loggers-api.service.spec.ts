import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LoggersApiService } from './loggers-api.service';
import { AppConfigService } from './app-config.service';
import { ServerApiService } from './server-api.service';
import { createMockAppConfigService, createMockServerApiService } from '../../../testing/test-helpers';

describe('LoggersApiService', () => {
  let service: LoggersApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: ServerApiService, useValue: createMockServerApiService() },
        LoggersApiService,
      ],
    });
    service = TestBed.inject(LoggersApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getLoggers() sends a GET to /api/loggers/', () => {
    service.getLoggers().subscribe();
    const req = http.expectOne('/api/loggers/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});

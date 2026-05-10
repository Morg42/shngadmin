import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  createMockAppConfigService,
  createMockServerApiService,
} from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { LogsApiService } from './logs-api.service';
import { ServerApiService } from './server-api.service';

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

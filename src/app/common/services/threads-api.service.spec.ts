import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { ThreadsApiService } from './threads-api.service';

describe('ThreadsApiService', () => {
  let service: ThreadsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        ThreadsApiService,
      ],
    });
    service = TestBed.inject(ThreadsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getThreads() sends a GET to /api/threads/', () => {
    service.getThreads().subscribe();
    const req = http.expectOne('/api/threads/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

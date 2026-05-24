/**
 * ThreadsApiService tests
 *
 * Covers:
 *   - getThreads() — GET /api/threads/
 *     Returns the response; of({}) on HTTP error
 */
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

  it('getThreads() sends GET /api/threads/', () => {
    service.getThreads().subscribe();
    const req = http.expectOne('/api/threads/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getThreads() returns the response', () => {
    let result: unknown;
    service.getThreads().subscribe((r) => (result = r));
    http.expectOne('/api/threads/').flush([{ name: 'main', state: 'running' }]);
    expect(result).toEqual([{ name: 'main', state: 'running' }]);
  });

  it('getThreads() returns {} on HTTP error', () => {
    let result: unknown;
    service.getThreads().subscribe((r) => (result = r));
    http
      .expectOne('/api/threads/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

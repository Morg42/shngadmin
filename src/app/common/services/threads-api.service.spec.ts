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

  it('getThreadTask() sends GET /api/threads/<ident> and returns the task details', () => {
    const details = {
      id: 123,
      task: {
        type: 'logic',
        name: 'logics.slow',
        started_at: '2026-10-22T10:00:00+02:00',
        runtime: 7.5,
        runtime_warn: 5,
        overdue: true,
        trigger: null,
      },
      stack: ['  File "x.py", line 1, in <module>\n'],
    };
    let result: unknown;
    service.getThreadTask(123).subscribe((r) => (result = r));
    const req = http.expectOne('/api/threads/123');
    expect(req.request.method).toBe('GET');
    req.flush(details);
    expect(result).toEqual(details);
  });

  it('getThreadTask() returns null on HTTP error (task already finished)', () => {
    let result: unknown = 'unset';
    service.getThreadTask(123).subscribe((r) => (result = r));
    http.expectOne('/api/threads/123').flush('', { status: 404, statusText: 'Not Found' });
    expect(result).toBeNull();
  });

  describe('cancelThreadTask()', () => {
    const cancel = () => {
      let result: unknown;
      service.cancelThreadTask(123, 17).subscribe((r) => (result = r));
      return { req: http.expectOne('/api/threads/123/cancel'), result: () => result };
    };

    it('sends POST /api/threads/<ident>/cancel with the task_id', () => {
      const { req, result } = cancel();
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ task_id: 17 });
      req.flush({ result: 'ok', state: 'requested' });
      expect(result()).toBe('requested');
    });

    it('maps 404 (task gone) to not_found', () => {
      const { req, result } = cancel();
      req.flush('', { status: 404, statusText: 'Not Found' });
      expect(result()).toBe('not_found');
    });

    it('maps 409 (not a logic) to not_cancellable', () => {
      const { req, result } = cancel();
      req.flush('', { status: 409, statusText: 'Conflict' });
      expect(result()).toBe('not_cancellable');
    });

    it('maps other errors to error', () => {
      const { req, result } = cancel();
      req.flush('', { status: 500, statusText: 'Server Error' });
      expect(result()).toBe('error');
    });
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

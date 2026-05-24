/**
 * LogsApiService tests
 *
 * Covers:
 *   - getLogs() — GET /api/logs/
 *     Returns the LogsType response; of({}) on HTTP error
 *   - readLogfile(filename, chunk?) — GET /api/logs/{filename}?chunk={n}
 *     chunk=null maps to chunk=1 (first chunk); chunk=0 maps to 0 (last chunk convention)
 *     Returns the response on success; returns a synthetic error object on HTTP error
 *     (note: empty apiUrl short-circuits without making a request)
 */
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

  // -------------------------------------------------------------------------
  // getLogs — GET /api/logs/
  // -------------------------------------------------------------------------

  it('getLogs() sends GET /api/logs/', () => {
    service.getLogs().subscribe();
    const req = http.expectOne('/api/logs/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getLogs() returns the response', () => {
    let result: unknown;
    service.getLogs().subscribe((r) => (result = r));
    http.expectOne('/api/logs/').flush({ shng: 'shng.log', warnings: 'warnings.log' });
    expect(result).toEqual({ shng: 'shng.log', warnings: 'warnings.log' });
  });

  it('getLogs() returns {} on HTTP error', () => {
    let result: unknown;
    service.getLogs().subscribe((r) => (result = r));
    http
      .expectOne('/api/logs/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // readLogfile — GET /api/logs/{filename}?chunk={n}
  // -------------------------------------------------------------------------

  it('readLogfile() with chunk=null sends chunk=1 in query param', () => {
    service.readLogfile('shng.log', null).subscribe();
    const req = http.expectOne((r) => r.url.includes('shng.log') && r.url.includes('chunk=1'));
    expect(req.request.method).toBe('GET');
    req.flush({ loglines: [] });
  });

  it('readLogfile() without chunk argument defaults to chunk=1', () => {
    service.readLogfile('shng.log').subscribe();
    const req = http.expectOne((r) => r.url.includes('chunk=1'));
    req.flush({ loglines: [] });
    expect(req.request.url).toContain('chunk=1');
  });

  it('readLogfile() with chunk=0 sends chunk=0 (last chunk)', () => {
    service.readLogfile('shng.log', 0).subscribe();
    const req = http.expectOne((r) => r.url.includes('chunk=0'));
    req.flush({ loglines: ['line1'] });
    expect(req.request.url).toContain('chunk=0');
  });

  it('readLogfile() with explicit chunk number sends that chunk', () => {
    service.readLogfile('shng.log', 3).subscribe();
    const req = http.expectOne((r) => r.url.includes('chunk=3'));
    req.flush({ loglines: ['line1', 'line2'] });
    expect(req.request.url).toContain('chunk=3');
  });

  it('readLogfile() returns the response on success', () => {
    let result: unknown;
    service.readLogfile('shng.log').subscribe((r) => (result = r));
    const payload = { file: 'shng.log', loglines: ['INFO started'] };
    http.expectOne((r) => r.url.includes('shng.log')).flush(payload);
    expect(result).toEqual(payload);
  });

  it('readLogfile() returns a synthetic error object on HTTP error', () => {
    let result: unknown;
    service.readLogfile('missing.log').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('missing.log'))
      .flush({ error: 'not found' }, { status: 404, statusText: 'Not Found' });
    const r = result as Record<string, unknown>;
    expect(r['loglines']).toEqual(['FILE NOT FOUND!']);
    expect(r['file']).toBe('missing.log');
  });
});

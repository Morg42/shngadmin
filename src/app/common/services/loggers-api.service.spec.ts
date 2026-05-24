/**
 * LoggersApiService tests
 *
 * Covers:
 *   - getLoggers() — GET /api/loggers/
 *     Returns the LoggersApiResponse; of({}) on HTTP error
 *   - setLoggerLevel(logger, level) — PUT /api/loggers/{logger}?level={level}
 *     Returns the response; of({}) on HTTP error
 *   - setHandlers(logger, handlerList) — PUT /api/loggers/{logger}?handlers={list}
 *     Returns the response; of({}) on HTTP error
 *   - addLogger(logger) — POST /api/loggers/{logger}/
 *     Returns the response; of({}) on HTTP error
 *   - deleteLogger(logger) — DELETE /api/loggers/{logger}/
 *     Returns the response; of({}) on HTTP error
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { LoggersApiService } from './loggers-api.service';

describe('LoggersApiService', () => {
  let service: LoggersApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
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

  // -------------------------------------------------------------------------
  // getLoggers — GET /api/loggers/
  // -------------------------------------------------------------------------

  it('getLoggers() sends GET /api/loggers/', () => {
    service.getLoggers().subscribe();
    const req = http.expectOne('/api/loggers/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getLoggers() returns the response', () => {
    let result: unknown;
    service.getLoggers().subscribe((r) => (result = r));
    http.expectOne('/api/loggers/').flush({ loggers: {} });
    expect(result).toEqual({ loggers: {} });
  });

  it('getLoggers() returns {} on HTTP error', () => {
    let result: unknown;
    service.getLoggers().subscribe((r) => (result = r));
    http
      .expectOne('/api/loggers/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // setLoggerLevel — PUT /api/loggers/{logger}?level={level}
  // -------------------------------------------------------------------------

  it('setLoggerLevel() sends PUT /api/loggers/{logger}?level={level}', () => {
    service.setLoggerLevel('root', 'DEBUG').subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('/api/loggers/root') && r.url.includes('level=DEBUG'),
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('setLoggerLevel() returns the response', () => {
    let result: unknown;
    service.setLoggerLevel('root', 'INFO').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('level=INFO')).flush({ result: 'ok' });
    expect(result).toEqual({ result: 'ok' });
  });

  it('setLoggerLevel() returns {} on HTTP error', () => {
    let result: unknown;
    service.setLoggerLevel('root', 'DEBUG').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('level=DEBUG'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // setHandlers — PUT /api/loggers/{logger}?handlers={list}
  // -------------------------------------------------------------------------

  it('setHandlers() sends PUT /api/loggers/{logger}?handlers={list}', () => {
    service.setHandlers('root', 'file,console').subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('/api/loggers/root') && r.url.includes('handlers='),
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('setHandlers() returns the response', () => {
    let result: unknown;
    service.setHandlers('root', 'file').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('handlers=file')).flush({ result: 'ok' });
    expect(result).toEqual({ result: 'ok' });
  });

  it('setHandlers() returns {} on HTTP error', () => {
    let result: unknown;
    service.setHandlers('root', 'file').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('handlers='))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // addLogger — POST /api/loggers/{logger}/
  // -------------------------------------------------------------------------

  it('addLogger() sends POST /api/loggers/{logger}/', () => {
    service.addLogger('mylogger').subscribe();
    const req = http.expectOne('/api/loggers/mylogger/');
    expect(req.request.method).toBe('POST');
    req.flush({ result: 'ok' });
  });

  it('addLogger() returns the response', () => {
    let result: unknown;
    service.addLogger('mylogger').subscribe((r) => (result = r));
    http.expectOne('/api/loggers/mylogger/').flush({ result: 'ok' });
    expect(result).toEqual({ result: 'ok' });
  });

  it('addLogger() returns {} on HTTP error', () => {
    let result: unknown;
    service.addLogger('mylogger').subscribe((r) => (result = r));
    http
      .expectOne('/api/loggers/mylogger/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // deleteLogger — DELETE /api/loggers/{logger}/
  // -------------------------------------------------------------------------

  it('deleteLogger() sends DELETE /api/loggers/{logger}/', () => {
    service.deleteLogger('mylogger').subscribe();
    const req = http.expectOne('/api/loggers/mylogger/');
    expect(req.request.method).toBe('DELETE');
    req.flush({ result: 'ok' });
  });

  it('deleteLogger() returns the response', () => {
    let result: unknown;
    service.deleteLogger('mylogger').subscribe((r) => (result = r));
    http.expectOne('/api/loggers/mylogger/').flush({ deleted: true });
    expect(result).toEqual({ deleted: true });
  });

  it('deleteLogger() returns {} on HTTP error', () => {
    let result: unknown;
    service.deleteLogger('mylogger').subscribe((r) => (result = r));
    http
      .expectOne('/api/loggers/mylogger/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

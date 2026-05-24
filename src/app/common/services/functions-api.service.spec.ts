/**
 * FunctionsApiService tests
 *
 * Covers:
 *   - getFunctions() — GET /api/functions/
 *     Returns the JSON response; of({}) on HTTP error
 *   - reloadFunction(name) — PUT /api/functions/reload/{name} (responseType: text)
 *     Returns the text response on success, of({}) on HTTP error
 *   - reloadFunctions() — PUT /api/functions/reload/all (responseType: text)
 *     Returns the text response on success, of({}) on HTTP error
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { FunctionsApiService } from './functions-api.service';

describe('FunctionsApiService', () => {
  let service: FunctionsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        FunctionsApiService,
      ],
    });
    service = TestBed.inject(FunctionsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // getFunctions — GET /api/functions/
  // -------------------------------------------------------------------------

  it('getFunctions() sends GET /api/functions/', () => {
    service.getFunctions().subscribe();
    const req = http.expectOne('/api/functions/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getFunctions() returns the response', () => {
    let result: unknown;
    service.getFunctions().subscribe((r) => (result = r));
    http.expectOne('/api/functions/').flush({ myfunc: {} });
    expect(result).toEqual({ myfunc: {} });
  });

  it('getFunctions() returns {} on HTTP error', () => {
    let result: unknown;
    service.getFunctions().subscribe((r) => (result = r));
    http
      .expectOne('/api/functions/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // reloadFunction — PUT /api/functions/reload/{name}
  // -------------------------------------------------------------------------

  it('reloadFunction() sends PUT /api/functions/reload/{name}', () => {
    service.reloadFunction('myfunc').subscribe();
    const req = http.expectOne('/api/functions/reload/myfunc');
    expect(req.request.method).toBe('PUT');
    req.flush('reloaded');
  });

  it('reloadFunction() returns the text response on success', () => {
    let result: unknown;
    service.reloadFunction('myfunc').subscribe((r) => (result = r));
    http.expectOne('/api/functions/reload/myfunc').flush('ok');
    expect(result).toBe('ok');
  });

  it('reloadFunction() returns {} on HTTP error', () => {
    let result: unknown;
    service.reloadFunction('myfunc').subscribe((r) => (result = r));
    http
      .expectOne('/api/functions/reload/myfunc')
      .flush('err', { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // reloadFunctions — PUT /api/functions/reload/all
  // -------------------------------------------------------------------------

  it('reloadFunctions() sends PUT /api/functions/reload/all', () => {
    service.reloadFunctions().subscribe();
    const req = http.expectOne('/api/functions/reload/all');
    expect(req.request.method).toBe('PUT');
    req.flush('reloaded');
  });

  it('reloadFunctions() returns the text response on success', () => {
    let result: unknown;
    service.reloadFunctions().subscribe((r) => (result = r));
    http.expectOne('/api/functions/reload/all').flush('all reloaded');
    expect(result).toBe('all reloaded');
  });

  it('reloadFunctions() returns {} on HTTP error', () => {
    let result: unknown;
    service.reloadFunctions().subscribe((r) => (result = r));
    http
      .expectOne('/api/functions/reload/all')
      .flush('err', { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

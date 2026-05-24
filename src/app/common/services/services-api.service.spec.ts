/**
 * ServicesApiService tests
 *
 * Covers:
 *   - CheckEvalData(evalData) — PUT /api/services/evalcheck/
 *     Returns the EvalResult object; of({}) on HTTP error
 *   - CheckYamlText(yamlText) — PUT /api/services/yamlcheck/ (responseType: text)
 *     Returns the text result; of({}) on HTTP error
 *   - ConvertToYamlText(confText) — PUT /api/services/yamlconvert/ (responseType: text)
 *     Returns the text result; of({}) on HTTP error
 *   - getCacheOrphans() — GET /api/services/cachecheck/
 *     Returns the response; of({}) on HTTP error
 *   - deleteCacheFile(filename) — PUT /api/services/cachefile_delete?filename=
 *     Returns the response; of({}) on HTTP error
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { ServicesApiService } from './services-api.service';

describe('ServicesApiService', () => {
  let service: ServicesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        ServicesApiService,
      ],
    });
    service = TestBed.inject(ServicesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // CheckEvalData — PUT /api/services/evalcheck/
  // -------------------------------------------------------------------------

  it('CheckEvalData() sends PUT /api/services/evalcheck/', () => {
    service.CheckEvalData({ expression: 'sh.item()' }).subscribe();
    const req = http.expectOne('/api/services/evalcheck/');
    expect(req.request.method).toBe('PUT');
    req.flush({ expression: 'sh.item()', type: 'bool', result: true });
  });

  it('CheckEvalData() returns the EvalResult from the backend', () => {
    let result: unknown;
    service.CheckEvalData({ expression: '1+1' }).subscribe((r) => (result = r));
    http.expectOne('/api/services/evalcheck/').flush({ expression: '1+1', type: 'int', result: 2 });
    expect(result).toEqual({ expression: '1+1', type: 'int', result: 2 });
  });

  it('CheckEvalData() returns {} on HTTP error', () => {
    let result: unknown;
    service.CheckEvalData({}).subscribe((r) => (result = r));
    http
      .expectOne('/api/services/evalcheck/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // CheckYamlText — PUT /api/services/yamlcheck/ (text)
  // -------------------------------------------------------------------------

  it('CheckYamlText() sends PUT /api/services/yamlcheck/', () => {
    service.CheckYamlText('key: value').subscribe();
    const req = http.expectOne('/api/services/yamlcheck/');
    expect(req.request.method).toBe('PUT');
    req.flush('ok');
  });

  it('CheckYamlText() returns the text response', () => {
    let result: unknown;
    service.CheckYamlText('key: value').subscribe((r) => (result = r));
    http.expectOne('/api/services/yamlcheck/').flush('ok');
    expect(result).toBe('ok');
  });

  it('CheckYamlText() returns {} on HTTP error', () => {
    let result: unknown;
    service.CheckYamlText('bad yaml').subscribe((r) => (result = r));
    http
      .expectOne('/api/services/yamlcheck/')
      .flush('invalid', { status: 400, statusText: 'Bad Request' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // ConvertToYamlText — PUT /api/services/yamlconvert/ (text)
  // -------------------------------------------------------------------------

  it('ConvertToYamlText() sends PUT /api/services/yamlconvert/', () => {
    service.ConvertToYamlText('legacy: config').subscribe();
    const req = http.expectOne('/api/services/yamlconvert/');
    expect(req.request.method).toBe('PUT');
    req.flush('key: value');
  });

  it('ConvertToYamlText() returns the converted text', () => {
    let result: unknown;
    service.ConvertToYamlText('old format').subscribe((r) => (result = r));
    http.expectOne('/api/services/yamlconvert/').flush('new: yaml');
    expect(result).toBe('new: yaml');
  });

  it('ConvertToYamlText() returns {} on HTTP error', () => {
    let result: unknown;
    service.ConvertToYamlText('broken').subscribe((r) => (result = r));
    http
      .expectOne('/api/services/yamlconvert/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // getCacheOrphans — GET /api/services/cachecheck/
  // -------------------------------------------------------------------------

  it('getCacheOrphans() sends GET /api/services/cachecheck/', () => {
    service.getCacheOrphans().subscribe();
    const req = http.expectOne('/api/services/cachecheck/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getCacheOrphans() returns the response', () => {
    let result: unknown;
    service.getCacheOrphans().subscribe((r) => (result = r));
    http.expectOne('/api/services/cachecheck/').flush(['orphan1.cache', 'orphan2.cache']);
    expect(result).toEqual(['orphan1.cache', 'orphan2.cache']);
  });

  it('getCacheOrphans() returns {} on HTTP error', () => {
    let result: unknown;
    service.getCacheOrphans().subscribe((r) => (result = r));
    http
      .expectOne('/api/services/cachecheck/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // deleteCacheFile — PUT /api/services/cachefile_delete?filename=
  // -------------------------------------------------------------------------

  it('deleteCacheFile() sends PUT with filename query param', () => {
    service.deleteCacheFile('orphan.cache').subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('cachefile_delete') && r.url.includes('filename=orphan.cache'),
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ deleted: true });
  });

  it('deleteCacheFile() returns the response', () => {
    let result: unknown;
    service.deleteCacheFile('stale.cache').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('stale.cache')).flush({ deleted: true });
    expect(result).toEqual({ deleted: true });
  });

  it('deleteCacheFile() returns {} on HTTP error', () => {
    let result: unknown;
    service.deleteCacheFile('missing.cache').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('missing.cache'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

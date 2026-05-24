/**
 * ScenesApiService tests
 *
 * Covers:
 *   - getScenes() — GET /api/scenes/
 *     Returns the JSON response; of({}) on HTTP error
 *   - reloadScene(name) — PUT /api/scenes/reload/{name} (responseType: text)
 *     Returns the text response if truthy, '' if empty; of({}) on HTTP error
 *   - reloadScenes() — PUT /api/scenes/reload/all (responseType: text)
 *     Returns the text response if truthy, '' if empty; of({}) on HTTP error
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { ScenesApiService } from './scenes-api.service';

describe('ScenesApiService', () => {
  let service: ScenesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        ScenesApiService,
      ],
    });
    service = TestBed.inject(ScenesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // getScenes — GET /api/scenes/
  // -------------------------------------------------------------------------

  it('getScenes() sends GET /api/scenes/', () => {
    service.getScenes().subscribe();
    const req = http.expectOne('/api/scenes/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getScenes() returns the response', () => {
    let result: unknown;
    service.getScenes().subscribe((r) => (result = r));
    http.expectOne('/api/scenes/').flush({ scene1: {}, scene2: {} });
    expect(result).toEqual({ scene1: {}, scene2: {} });
  });

  it('getScenes() returns {} on HTTP error', () => {
    let result: unknown;
    service.getScenes().subscribe((r) => (result = r));
    http
      .expectOne('/api/scenes/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // reloadScene — PUT /api/scenes/reload/{name}
  // -------------------------------------------------------------------------

  it('reloadScene() sends PUT /api/scenes/reload/{name}', () => {
    service.reloadScene('myscene').subscribe();
    const req = http.expectOne('/api/scenes/reload/myscene');
    expect(req.request.method).toBe('PUT');
    req.flush('reloaded');
  });

  it('reloadScene() returns the text response on success', () => {
    let result: unknown;
    service.reloadScene('myscene').subscribe((r) => (result = r));
    http.expectOne('/api/scenes/reload/myscene').flush('ok');
    expect(result).toBe('ok');
  });

  it('reloadScene() returns {} on HTTP error', () => {
    let result: unknown;
    service.reloadScene('myscene').subscribe((r) => (result = r));
    http
      .expectOne('/api/scenes/reload/myscene')
      .flush('err', { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // reloadScenes — PUT /api/scenes/reload/all
  // -------------------------------------------------------------------------

  it('reloadScenes() sends PUT /api/scenes/reload/all', () => {
    service.reloadScenes().subscribe();
    const req = http.expectOne('/api/scenes/reload/all');
    expect(req.request.method).toBe('PUT');
    req.flush('reloaded');
  });

  it('reloadScenes() returns the text response on success', () => {
    let result: unknown;
    service.reloadScenes().subscribe((r) => (result = r));
    http.expectOne('/api/scenes/reload/all').flush('all reloaded');
    expect(result).toBe('all reloaded');
  });

  it('reloadScenes() returns {} on HTTP error', () => {
    let result: unknown;
    service.reloadScenes().subscribe((r) => (result = r));
    http
      .expectOne('/api/scenes/reload/all')
      .flush('err', { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

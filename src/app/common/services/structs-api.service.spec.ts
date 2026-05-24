/**
 * StructsApiService tests
 *
 * Covers:
 *   - getStructs() — GET /api/items/structs/
 *     Returns the response; of({}) on HTTP error
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { StructsApiService } from './structs-api.service';

describe('StructsApiService', () => {
  let service: StructsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        StructsApiService,
      ],
    });
    service = TestBed.inject(StructsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getStructs() sends GET /api/items/structs/', () => {
    service.getStructs().subscribe();
    const req = http.expectOne('/api/items/structs/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getStructs() returns the response', () => {
    let result: unknown;
    service.getStructs().subscribe((r) => (result = r));
    http.expectOne('/api/items/structs/').flush({ mystruct: {} });
    expect(result).toEqual({ mystruct: {} });
  });

  it('getStructs() returns {} on HTTP error', () => {
    let result: unknown;
    service.getStructs().subscribe((r) => (result = r));
    http
      .expectOne('/api/items/structs/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

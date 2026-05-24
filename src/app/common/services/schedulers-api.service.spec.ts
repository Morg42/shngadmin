/**
 * SchedulersApiService tests
 *
 * Covers:
 *   - getSchedulers() — GET /api/schedulers/
 *     Returns the response; of([]) on HTTP error
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { SchedulersApiService } from './schedulers-api.service';

describe('SchedulersApiService', () => {
  let service: SchedulersApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        SchedulersApiService,
      ],
    });
    service = TestBed.inject(SchedulersApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getSchedulers() sends GET /api/schedulers/', () => {
    service.getSchedulers().subscribe();
    const req = http.expectOne('/api/schedulers/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getSchedulers() returns the response', () => {
    let result: unknown;
    service.getSchedulers().subscribe((r) => (result = r));
    http.expectOne('/api/schedulers/').flush([{ name: 'my_scheduler' }]);
    expect(result).toEqual([{ name: 'my_scheduler' }]);
  });

  it('getSchedulers() returns [] on HTTP error', () => {
    let result: unknown;
    service.getSchedulers().subscribe((r) => (result = r));
    http
      .expectOne('/api/schedulers/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual([]);
  });
});

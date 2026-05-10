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

  it('getCacheOrphans() sends a GET to /api/services/cachecheck/', () => {
    service.getCacheOrphans().subscribe();
    const req = http.expectOne('/api/services/cachecheck/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

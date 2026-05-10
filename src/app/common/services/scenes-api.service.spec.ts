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

  it('getScenes() sends a GET to /api/scenes/', () => {
    service.getScenes().subscribe();
    const req = http.expectOne('/api/scenes/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

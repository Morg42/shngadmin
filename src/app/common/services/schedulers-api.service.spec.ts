import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SchedulersApiService } from './schedulers-api.service';
import { AppConfigService } from './app-config.service';
import { createMockAppConfigService } from '../../../testing/test-helpers';

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

  it('getSchedulers() sends a GET to /api/schedulers/', () => {
    service.getSchedulers().subscribe();
    const req = http.expectOne('/api/schedulers/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

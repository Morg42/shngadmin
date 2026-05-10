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

  it('getFunctions() sends a GET to /api/functions/', () => {
    service.getFunctions().subscribe();
    const req = http.expectOne('/api/functions/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ConfigApiService } from './config-api.service';
import { AppConfigService } from './app-config.service';
import { createMockAppConfigService } from '../../../testing/test-helpers';

describe('ConfigApiService', () => {
  let service: ConfigApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        ConfigApiService,
      ],
    });
    service = TestBed.inject(ConfigApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getConfig() sends a GET to /api/config/', () => {
    service.getConfig().subscribe();
    const req = http.expectOne('/api/config/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('saveConfig() sends a PUT to /api/config/core/', () => {
    service.saveConfig({ key: 'value' }).subscribe();
    const req = http.expectOne('/api/config/core/');
    expect(req.request.method).toBe('PUT');
    req.flush(true);
  });
});

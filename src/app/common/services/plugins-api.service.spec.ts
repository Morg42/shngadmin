import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { PluginsApiService } from './plugins-api.service';

describe('PluginsApiService', () => {
  let service: PluginsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        PluginsApiService,
      ],
    });
    service = TestBed.inject(PluginsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getInstalledPlugins() sends a GET to /api/plugins/installed/', () => {
    service.getInstalledPlugins().subscribe();
    const req = http.expectOne('/api/plugins/installed/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getPluginsConfig() sends a GET to /api/plugins/config/', () => {
    service.getPluginsConfig().subscribe();
    const req = http.expectOne('/api/plugins/config/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});

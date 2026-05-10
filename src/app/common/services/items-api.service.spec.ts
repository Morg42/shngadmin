import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ItemsApiService } from './items-api.service';
import { AppConfigService } from './app-config.service';
import { createMockAppConfigService } from '../../../testing/test-helpers';

describe('ItemsApiService', () => {
  let service: ItemsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        ItemsApiService,
      ],
    });
    service = TestBed.inject(ItemsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getItemList() sends a GET to /api/items/list/', () => {
    service.getItemList().subscribe();
    const req = http.expectOne('/api/items/list/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FilesApiService } from './files-api.service';
import { AppConfigService } from './app-config.service';
import { createMockAppConfigService } from '../../../testing/test-helpers';

describe('FilesApiService', () => {
  let service: FilesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        FilesApiService,
      ],
    });
    service = TestBed.inject(FilesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('readFile() sends a GET to /api/files/{filetype}/', () => {
    service.readFile('logics', 'my_logic.py').subscribe();
    const req = http.expectOne(r => r.url.startsWith('/api/files/logics/'));
    expect(req.request.method).toBe('GET');
    req.flush('');
  });
});

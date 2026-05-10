import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { JwtModule } from '@auth0/angular-jwt';
import { ServerApiService } from './server-api.service';
import { AppConfigService } from './app-config.service';
import { UserPreferencesService } from './user-preferences.service';
import { translateTestingModule, createMockAppConfigService } from '../../../testing/test-helpers';

describe('ServerApiService', () => {
  let service: ServerApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    const appConfigMock = createMockAppConfigService();
    appConfigMock.apiUrl = '/api/';

    TestBed.configureTestingModule({
      imports: [
        translateTestingModule,
        JwtModule.forRoot({ config: { tokenGetter: () => null } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserPreferencesService,
        { provide: AppConfigService, useValue: appConfigMock },
        { provide: 'BASE_URL', useValue: 'http://localhost/' },
        ServerApiService,
      ],
    });
    service = TestBed.inject(ServerApiService);
    http = TestBed.inject(HttpTestingController);
    // Flush the server/info call issued in the constructor
    http.match(req => req.url.includes('server/')).forEach(r => r.flush({}));
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getServerBasicinfo() makes a GET request to the server endpoint', () => {
    service.getServerBasicinfo().subscribe();
    const req = http.expectOne(req => req.url.includes('server/'));
    expect(req.request.method).toBe('GET');
    req.flush({ default_language: 'en', client_ip: '127.0.0.1' });
  });
});

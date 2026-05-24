/**
 * ServerApiService tests
 *
 * Strategy: inject the real service (which calls patch() in constructor) with a
 * mocked AppConfigService, flush any requests initiated during construction,
 * then exercise each public method.
 *
 * Covers:
 *   - getServerBasicinfo() — GET /api/server/ — patches appConfig, returns ServerInfo
 *   - getServerinfo() — GET /api/server/info — patches appConfig, returns ServerInfo
 *   - getShngServerStatus() — GET /api/server/status/ — passthrough; of({}) on error
 *   - restartShngServer() — PUT /api/server/restart/ — passthrough; of({}) on error
 *   - getSystemStats() — GET /api/system/info — passthrough; of({}) on error
 *   - getPypiInfo() — GET /api/server/pypi — passthrough; of([]) on error
 *   - downloadConfigBackup() — GET /api/files/backup/ (blob) — passthrough; of({}) on error
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { JwtModule } from '@auth0/angular-jwt';
import { createMockAppConfigService, translateTestingModule } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { ServerApiService } from './server-api.service';
import { UserPreferencesService } from './user-preferences.service';

describe('ServerApiService', () => {
  let service: ServerApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    const appConfigMock = createMockAppConfigService();
    appConfigMock.apiUrl = '/api/';

    TestBed.configureTestingModule({
      imports: [translateTestingModule, JwtModule.forRoot({ config: { tokenGetter: () => null } })],
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
    // Flush any server/ requests initiated during construction
    http.match((req) => req.url.includes('server/')).forEach((r) => r.flush({}));
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // getServerBasicinfo
  // -------------------------------------------------------------------------

  it('getServerBasicinfo() sends GET /api/server/', () => {
    service.getServerBasicinfo().subscribe();
    const req = http.expectOne((req) => req.url.includes('server/'));
    expect(req.request.method).toBe('GET');
    req.flush({ default_language: 'en', client_ip: '127.0.0.1' });
  });

  it('getServerBasicinfo() returns the server info', () => {
    let result: unknown;
    service.getServerBasicinfo().subscribe((r) => (result = r));
    http
      .expectOne((req) => req.url.includes('server/'))
      .flush({ default_language: 'en', client_ip: '127.0.0.1', login_required: false });
    const r = result as { default_language: string; client_ip: string };
    expect(r.default_language).toBe('en');
    expect(r.client_ip).toBe('127.0.0.1');
  });

  it('getServerBasicinfo() returns {} on HTTP error', () => {
    let result: unknown;
    service.getServerBasicinfo().subscribe((r) => (result = r));
    http
      .expectOne((req) => req.url.includes('server/'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // getServerinfo
  // -------------------------------------------------------------------------

  it('getServerinfo() sends GET /api/server/info', () => {
    service.getServerinfo().subscribe();
    const req = http.expectOne('/api/server/info');
    expect(req.request.method).toBe('GET');
    req.flush({ tz: 'Europe/Berlin', websocket_port: '2424' });
  });

  it('getServerinfo() returns the server info', () => {
    let result: unknown;
    service.getServerinfo().subscribe((r) => (result = r));
    http.expectOne('/api/server/info').flush({ tz: 'Europe/Berlin', websocket_port: '2424' });
    const r = result as { tz: string };
    expect(r.tz).toBe('Europe/Berlin');
  });

  it('getServerinfo() returns {} on HTTP error', () => {
    let result: unknown;
    service.getServerinfo().subscribe((r) => (result = r));
    http
      .expectOne('/api/server/info')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // getShngServerStatus
  // -------------------------------------------------------------------------

  it('getShngServerStatus() sends GET /api/server/status/', () => {
    service.getShngServerStatus().subscribe();
    const req = http.expectOne('/api/server/status/');
    expect(req.request.method).toBe('GET');
    req.flush({ running: true });
  });

  it('getShngServerStatus() returns the response', () => {
    let result: unknown;
    service.getShngServerStatus().subscribe((r) => (result = r));
    http.expectOne('/api/server/status/').flush({ running: true });
    expect(result).toEqual({ running: true });
  });

  it('getShngServerStatus() returns {} on HTTP error', () => {
    let result: unknown;
    service.getShngServerStatus().subscribe((r) => (result = r));
    http
      .expectOne('/api/server/status/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // restartShngServer
  // -------------------------------------------------------------------------

  it('restartShngServer() sends PUT /api/server/restart/', () => {
    service.restartShngServer().subscribe();
    const req = http.expectOne('/api/server/restart/');
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('restartShngServer() returns the response', () => {
    let result: unknown;
    service.restartShngServer().subscribe((r) => (result = r));
    http.expectOne('/api/server/restart/').flush({ result: 'ok' });
    expect(result).toEqual({ result: 'ok' });
  });

  it('restartShngServer() returns {} on HTTP error', () => {
    let result: unknown;
    service.restartShngServer().subscribe((r) => (result = r));
    http
      .expectOne('/api/server/restart/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // getSystemStats
  // -------------------------------------------------------------------------

  it('getSystemStats() sends GET /api/system/info', () => {
    service.getSystemStats().subscribe();
    const req = http.expectOne('/api/system/info');
    expect(req.request.method).toBe('GET');
    req.flush({ cpu: 12.5, memory: 45.0 });
  });

  it('getSystemStats() returns the response', () => {
    let result: unknown;
    service.getSystemStats().subscribe((r) => (result = r));
    http.expectOne('/api/system/info').flush({ cpu: 12.5, memory: 45.0 });
    expect(result).toEqual({ cpu: 12.5, memory: 45.0 });
  });

  it('getSystemStats() returns {} on HTTP error', () => {
    let result: unknown;
    service.getSystemStats().subscribe((r) => (result = r));
    http
      .expectOne('/api/system/info')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // getPypiInfo
  // -------------------------------------------------------------------------

  it('getPypiInfo() sends GET /api/server/pypi', () => {
    service.getPypiInfo().subscribe();
    const req = http.expectOne('/api/server/pypi');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getPypiInfo() returns the response', () => {
    let result: unknown;
    service.getPypiInfo().subscribe((r) => (result = r));
    http.expectOne('/api/server/pypi').flush([{ name: 'requests', version: '2.31' }]);
    expect(result).toEqual([{ name: 'requests', version: '2.31' }]);
  });

  it('getPypiInfo() returns [] on HTTP error', () => {
    let result: unknown;
    service.getPypiInfo().subscribe((r) => (result = r));
    http
      .expectOne('/api/server/pypi')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // downloadConfigBackup
  // -------------------------------------------------------------------------

  it('downloadConfigBackup() sends GET /api/files/backup/', () => {
    service.downloadConfigBackup().subscribe();
    const req = http.expectOne('/api/files/backup/');
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['zip content'], { type: 'application/zip' }));
  });

  it('downloadConfigBackup() returns {} on HTTP error', () => {
    let result: unknown;
    service.downloadConfigBackup().subscribe((r) => (result = r));
    // blob responseType requires flushing a Blob body (cannot flush plain objects)
    http
      .expectOne('/api/files/backup/')
      .flush(new Blob([''], { type: 'text/plain' }), { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

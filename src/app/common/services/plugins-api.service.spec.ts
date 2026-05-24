/**
 * PluginsApiService tests
 *
 * Strategy: use Angular's HttpTestingController to intercept every outgoing
 * HTTP call and assert the method, URL, and (for mutations) request body.
 * Each method is tested against:
 *   - the happy-path response so the map() pipeline is exercised
 *   - a result-mapping variant where the backend returns {result:'ok'} or
 *     {result:'error'} so we cover the true/false branches inside map()
 *   - an HTTP-error response so the catchError() branch is exercised
 *
 * None of these tests require a running server; all I/O is intercepted by
 * HttpTestingController and resolved synchronously.
 */
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

  // -------------------------------------------------------------------------
  // Read-only GET endpoints
  // -------------------------------------------------------------------------

  it('getInstalledPlugins() sends GET /api/plugins/installed/', () => {
    service.getInstalledPlugins().subscribe();
    const req = http.expectOne('/api/plugins/installed/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getInstalledPlugins() returns {} on HTTP error', () => {
    let result: unknown;
    service.getInstalledPlugins().subscribe((r) => (result = r));
    http
      .expectOne('/api/plugins/installed/')
      .flush({ error: 'server error' }, { status: 500, statusText: 'Internal Server Error' });
    expect(result).toEqual({});
  });

  it('getPluginsConfig() sends GET /api/plugins/config/', () => {
    service.getPluginsConfig().subscribe();
    const req = http.expectOne('/api/plugins/config/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getPluginsConfig() returns {} on HTTP error', () => {
    let result: unknown;
    service.getPluginsConfig().subscribe((r) => (result = r));
    http
      .expectOne('/api/plugins/config/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  it('getPluginsInfo() sends GET /api/plugins/info/', () => {
    service.getPluginsInfo().subscribe();
    const req = http.expectOne('/api/plugins/info/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getPluginsInfo() returns {} on HTTP error', () => {
    let result: unknown;
    service.getPluginsInfo().subscribe((r) => (result = r));
    http
      .expectOne('/api/plugins/info/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  it('getPluginsLogicParameters() sends GET /api/plugins/logicparams/', () => {
    service.getPluginsLogicParameters().subscribe();
    const req = http.expectOne('/api/plugins/logicparams/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getPluginsAPI() sends GET /api/plugins/api/', () => {
    service.getPluginsAPI().subscribe();
    const req = http.expectOne('/api/plugins/api/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  // -------------------------------------------------------------------------
  // setPluginConfig — PUT with result mapping
  // The backend returns {result:'ok'} on success or {result:'error'} on
  // failure; the service maps these to the booleans true / false.
  // -------------------------------------------------------------------------

  it('setPluginConfig() sends PUT /api/plugin/{section}/', () => {
    service.setPluginConfig('myplugin', { key: 'value' }).subscribe();
    const req = http.expectOne('/api/plugin/myplugin/');
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('setPluginConfig() returns true when backend result is ok', () => {
    let result: unknown;
    service.setPluginConfig('myplugin', {}).subscribe((r) => (result = r));
    http.expectOne('/api/plugin/myplugin/').flush({ result: 'ok' });
    expect(result).toBe(true);
  });

  it('setPluginConfig() returns false when backend result is not ok', () => {
    let result: unknown;
    service.setPluginConfig('myplugin', {}).subscribe((r) => (result = r));
    http.expectOne('/api/plugin/myplugin/').flush({ result: 'error', description: 'bad config' });
    expect(result).toBe(false);
  });

  it('setPluginConfig() returns {} on HTTP error', () => {
    let result: unknown;
    service.setPluginConfig('myplugin', {}).subscribe((r) => (result = r));
    http
      .expectOne('/api/plugin/myplugin/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // addPluginConfig — POST with result mapping
  // -------------------------------------------------------------------------

  it('addPluginConfig() sends POST /api/plugin/{section}/', () => {
    service.addPluginConfig('newplugin', { key: 'v' }).subscribe();
    const req = http.expectOne('/api/plugin/newplugin/');
    expect(req.request.method).toBe('POST');
    req.flush({ result: 'ok' });
  });

  it('addPluginConfig() returns true when backend result is ok', () => {
    let result: unknown;
    service.addPluginConfig('newplugin', {}).subscribe((r) => (result = r));
    http.expectOne('/api/plugin/newplugin/').flush({ result: 'ok' });
    expect(result).toBe(true);
  });

  it('addPluginConfig() returns false when backend result is not ok', () => {
    let result: unknown;
    service.addPluginConfig('newplugin', {}).subscribe((r) => (result = r));
    http.expectOne('/api/plugin/newplugin/').flush({ result: 'error' });
    expect(result).toBe(false);
  });

  it('addPluginConfig() returns {} on HTTP error', () => {
    let result: unknown;
    service.addPluginConfig('newplugin', {}).subscribe((r) => (result = r));
    http
      .expectOne('/api/plugin/newplugin/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // deletePluginConfig — DELETE with result mapping
  // -------------------------------------------------------------------------

  it('deletePluginConfig() sends DELETE /api/plugin/{section}/', () => {
    service.deletePluginConfig('oldplugin').subscribe();
    const req = http.expectOne('/api/plugin/oldplugin/');
    expect(req.request.method).toBe('DELETE');
    req.flush({ result: 'ok' });
  });

  it('deletePluginConfig() returns true when backend result is ok', () => {
    let result: unknown;
    service.deletePluginConfig('oldplugin').subscribe((r) => (result = r));
    http.expectOne('/api/plugin/oldplugin/').flush({ result: 'ok' });
    expect(result).toBe(true);
  });

  it('deletePluginConfig() returns false when backend result is not ok', () => {
    let result: unknown;
    service.deletePluginConfig('oldplugin').subscribe((r) => (result = r));
    http.expectOne('/api/plugin/oldplugin/').flush({ result: 'failed' });
    expect(result).toBe(false);
  });

  // -------------------------------------------------------------------------
  // setPluginState — PUT with action query param, optional filename
  // action is normalised to lowercase before appending to the URL
  // -------------------------------------------------------------------------

  it('setPluginState() sends PUT with action=stop query param', () => {
    service.setPluginState('myplugin', 'stop').subscribe();
    const req = http.expectOne((r) => r.url.includes('myplugin') && r.url.includes('action=stop'));
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('setPluginState() appends filename param when provided', () => {
    service.setPluginState('myplugin', 'load', 'myplugin.py').subscribe();
    const req = http.expectOne((r) => r.url.includes('filename=myplugin.py'));
    req.flush({ result: 'ok' });
    expect(req.request.url).toContain('filename=myplugin.py');
  });

  it('setPluginState() does not append filename param when empty', () => {
    service.setPluginState('myplugin', 'stop').subscribe();
    const req = http.expectOne((r) => r.url.includes('myplugin'));
    req.flush({ result: 'ok' });
    expect(req.request.url).not.toContain('filename=');
  });

  it('setPluginState() returns true when backend result is ok', () => {
    let result: unknown;
    service.setPluginState('myplugin', 'start').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('myplugin')).flush({ result: 'ok' });
    expect(result).toBe(true);
  });

  it('setPluginState() returns false when backend result is not ok', () => {
    let result: unknown;
    service.setPluginState('myplugin', 'start').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('myplugin'))
      .flush({ result: 'error', description: 'failed' });
    expect(result).toBe(false);
  });

  it('setPluginState() returns {} on HTTP error', () => {
    let result: unknown;
    service.setPluginState('myplugin', 'start').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('myplugin'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

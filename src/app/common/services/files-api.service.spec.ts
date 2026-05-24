/**
 * FilesApiService tests
 *
 * Covers:
 *   - readFile(filetype, filename?) — GET /api/files/{type}/ with optional ?filename=
 *     Uses responseType:'text', so HTTP errors produce a fallback of('')
 *   - createFile(filetype, filename, content) — POST /api/files/{type}/?filename=
 *     Re-throws on HTTP error (not swallowed by of({}))
 *   - saveFile(filetype, filename?, content?) — PUT /api/files/{type}/ with optional ?filename=
 *     Returns the text response on success, of({}) on HTTP error
 *   - saveLoggingConfig(content) — PUT /api/files/logging/
 *     Returns a LoggingConfigSaveResult; on HTTP error returns a synthetic error result
 *   - deleteFile(filetype, filename?) — DELETE /api/files/{type}/ with optional ?filename=
 *     Returns the text response on success, of('') on HTTP error
 *   - getfileList(filetype) — GET /api/files/{type}/ (same URL, but JSON not text)
 *     Returns the response on success, of({}) on HTTP error
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { FilesApiService } from './files-api.service';

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

  // -------------------------------------------------------------------------
  // readFile — GET (responseType: text)
  // -------------------------------------------------------------------------

  it('readFile() without filename sends GET /api/files/{type}/', () => {
    service.readFile('logics').subscribe();
    const req = http.expectOne('/api/files/logics/');
    expect(req.request.method).toBe('GET');
    req.flush('file content');
  });

  it('readFile() with filename appends ?filename= query param', () => {
    service.readFile('logics', 'my_logic.py').subscribe();
    const req = http.expectOne((r) => r.url.includes('filename=my_logic.py'));
    expect(req.request.method).toBe('GET');
    req.flush('# logic content');
  });

  it('readFile() returns the text response', () => {
    let result: unknown;
    service.readFile('logics', 'my_logic.py').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('my_logic')).flush('# hello world');
    expect(result).toBe('# hello world');
  });

  it('readFile() returns empty string on HTTP error', () => {
    let result: unknown;
    service.readFile('logics', 'missing.py').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('missing'))
      .flush('not found', { status: 404, statusText: 'Not Found' });
    expect(result).toBe('');
  });

  // -------------------------------------------------------------------------
  // createFile — POST
  // -------------------------------------------------------------------------

  it('createFile() sends POST /api/files/{type}/?filename=', () => {
    service.createFile('logics', 'new_logic.py', '# new').subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('/api/files/logics/') && r.url.includes('filename=new_logic.py'),
    );
    expect(req.request.method).toBe('POST');
    req.flush('ok');
  });

  it('createFile() returns the response text on success', () => {
    let result: unknown;
    service.createFile('logics', 'new_logic.py', '# body').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('new_logic')).flush('created');
    expect(result).toBe('created');
  });

  it('createFile() re-throws on HTTP error', () => {
    let thrownError: unknown;
    service.createFile('logics', 'dup.py', '').subscribe({
      error: (e) => (thrownError = e),
    });
    http
      .expectOne((r) => r.url.includes('dup.py'))
      .flush({ error: 'exists' }, { status: 409, statusText: 'Conflict' });
    expect(thrownError).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // saveFile — PUT (responseType: text)
  // -------------------------------------------------------------------------

  it('saveFile() without filename sends PUT /api/files/{type}/', () => {
    service.saveFile('smarthome', '', 'yaml content').subscribe();
    const req = http.expectOne('/api/files/smarthome/');
    expect(req.request.method).toBe('PUT');
    req.flush('saved');
  });

  it('saveFile() with filename appends ?filename= query param', () => {
    service.saveFile('logics', 'my_logic.py', '# updated').subscribe();
    const req = http.expectOne((r) => r.url.includes('filename=my_logic.py'));
    expect(req.request.method).toBe('PUT');
    req.flush('saved');
  });

  it('saveFile() returns the response text', () => {
    let result: unknown;
    service.saveFile('logics', 'my_logic.py', '').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('my_logic')).flush('ok');
    expect(result).toBe('ok');
  });

  it('saveFile() returns {} on HTTP error', () => {
    let result: unknown;
    service.saveFile('logics', 'bad.py', '').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('bad.py'))
      .flush('err', { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // saveLoggingConfig — PUT /api/files/logging/
  // -------------------------------------------------------------------------

  it('saveLoggingConfig() sends PUT /api/files/logging/', () => {
    service.saveLoggingConfig('version: 1').subscribe();
    const req = http.expectOne('/api/files/logging/');
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok', config_reloaded: true });
  });

  it('saveLoggingConfig() returns the backend result object', () => {
    let result: unknown;
    service.saveLoggingConfig('yaml').subscribe((r) => (result = r));
    http.expectOne('/api/files/logging/').flush({ result: 'ok', config_reloaded: true });
    expect(result).toEqual({ result: 'ok', config_reloaded: true });
  });

  it('saveLoggingConfig() returns a synthetic error result on HTTP error', () => {
    let result: unknown;
    service.saveLoggingConfig('bad yaml').subscribe((r) => (result = r));
    http
      .expectOne('/api/files/logging/')
      .flush({ error: 'invalid yaml' }, { status: 400, statusText: 'Bad Request' });
    const r = result as { result: string; config_restored: boolean };
    expect(r.result).toBe('error');
  });

  // -------------------------------------------------------------------------
  // deleteFile — DELETE (responseType: text)
  // -------------------------------------------------------------------------

  it('deleteFile() without filename sends DELETE /api/files/{type}/', () => {
    service.deleteFile('logics').subscribe();
    const req = http.expectOne('/api/files/logics/');
    expect(req.request.method).toBe('DELETE');
    req.flush('deleted');
  });

  it('deleteFile() with filename appends ?filename= query param', () => {
    service.deleteFile('logics', 'old_logic.py').subscribe();
    const req = http.expectOne((r) => r.url.includes('filename=old_logic.py'));
    expect(req.request.method).toBe('DELETE');
    req.flush('deleted');
  });

  it('deleteFile() returns empty string on HTTP error', () => {
    let result: unknown;
    service.deleteFile('logics', 'gone.py').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('gone.py'))
      .flush('not found', { status: 404, statusText: 'Not Found' });
    expect(result).toBe('');
  });

  // -------------------------------------------------------------------------
  // getfileList — GET (JSON response)
  // -------------------------------------------------------------------------

  it('getfileList() sends GET /api/files/{type}/', () => {
    service.getfileList('logics').subscribe();
    const req = http.expectOne('/api/files/logics/');
    expect(req.request.method).toBe('GET');
    req.flush(['logic1.py', 'logic2.py']);
  });

  it('getfileList() returns the response', () => {
    let result: unknown;
    service.getfileList('logics').subscribe((r) => (result = r));
    http.expectOne('/api/files/logics/').flush(['a.py', 'b.py']);
    expect(result).toEqual(['a.py', 'b.py']);
  });

  it('getfileList() returns {} on HTTP error', () => {
    let result: unknown;
    service.getfileList('logics').subscribe((r) => (result = r));
    http
      .expectOne('/api/files/logics/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

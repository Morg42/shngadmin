/**
 * LogicsApiService tests
 *
 * Covers:
 *   - groupExpanded BehaviorSubject property: getter, setter, and observable stream
 *   - Read-only GET endpoints: getLogics, getGroupsInfo, getLogic, getLogicState
 *   - State mutations via PUT: setLogicState (action + optional filename),
 *     saveLogicParameters, saveLogicGroup, deleteLogicGroup
 *   - Result mapping: backend {result:'ok'} → true, any other result → false
 *   - HTTP error paths: catchError returns of({}) for all mutation methods
 *     and of({}) for GET methods
 *
 * Note: setLogicState normalises the action to lowercase before appending
 * it to the URL — the tests confirm the resulting URL contains the lowercase form.
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { LogicsApiService } from './logics-api.service';

describe('LogicsApiService', () => {
  let service: LogicsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        MessageService,
        LogicsApiService,
      ],
    });
    service = TestBed.inject(LogicsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // groupExpanded BehaviorSubject
  // -------------------------------------------------------------------------

  it('groupExpanded getter returns the initial empty array', () => {
    expect(service.groupExpanded).toEqual([]);
  });

  it('groupExpanded setter updates the value and the getter reflects it', () => {
    service.groupExpanded = [1, 2, 3];
    expect(service.groupExpanded).toEqual([1, 2, 3]);
  });

  it('groupExpanded$ observable emits the latest value set via the setter', (done) => {
    service.groupExpanded$.subscribe((val) => {
      if (val.length > 0) {
        expect(val).toEqual([42]);
        done();
      }
    });
    service.groupExpanded = [42];
  });

  // -------------------------------------------------------------------------
  // Read-only GET endpoints
  // -------------------------------------------------------------------------

  it('getLogics() sends GET /api/logics/', () => {
    service.getLogics().subscribe();
    const req = http.expectOne('/api/logics/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getLogics() returns {} on HTTP error', () => {
    let result: unknown;
    service.getLogics().subscribe((r) => (result = r));
    http
      .expectOne('/api/logics/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  it('getGroupsInfo() sends GET /api/logics/?infotype=groups', () => {
    service.getGroupsInfo().subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('logics') && r.url.includes('infotype=groups'),
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getGroupsInfo() returns {} on HTTP error', () => {
    let result: unknown;
    service.getGroupsInfo().subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('infotype=groups'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  it('getLogic() sends GET /api/logics/{name}', () => {
    service.getLogic('mylogic').subscribe();
    const req = http.expectOne('/api/logics/mylogic');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getLogic() returns {} on HTTP error', () => {
    let result: unknown;
    service.getLogic('mylogic').subscribe((r) => (result = r));
    http
      .expectOne('/api/logics/mylogic')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  it('getLogicState() sends GET /api/logics/{name}?infotype=status', () => {
    service.getLogicState('mylogic').subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('mylogic') && r.url.includes('infotype=status'),
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getLogicState() returns {} on HTTP error', () => {
    let result: unknown;
    service.getLogicState('mylogic').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('infotype=status'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // setLogicState — PUT with action param (normalised to lowercase) + optional filename
  // -------------------------------------------------------------------------

  it('setLogicState() sends PUT with action=trigger in the URL', () => {
    service.setLogicState('mylogic', 'trigger').subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('mylogic') && r.url.includes('action=trigger'),
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('setLogicState() normalises action to lowercase', () => {
    service.setLogicState('mylogic', 'ENABLE').subscribe();
    const req = http.expectOne((r) => r.url.includes('action=enable'));
    expect(req.request.url).not.toContain('action=ENABLE');
    req.flush({ result: 'ok' });
  });

  it('setLogicState() appends filename param when provided', () => {
    service.setLogicState('mylogic', 'load', 'mylogic.py').subscribe();
    const req = http.expectOne((r) => r.url.includes('filename=mylogic.py'));
    req.flush({ result: 'ok' });
    expect(req.request.url).toContain('filename=mylogic.py');
  });

  it('setLogicState() does not append filename when empty', () => {
    service.setLogicState('mylogic', 'unload').subscribe();
    const req = http.expectOne((r) => r.url.includes('mylogic'));
    req.flush({ result: 'ok' });
    expect(req.request.url).not.toContain('filename=');
  });

  it('setLogicState() returns true when backend result is ok', () => {
    let result: unknown;
    service.setLogicState('mylogic', 'enable').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('mylogic')).flush({ result: 'ok' });
    expect(result).toBe(true);
  });

  it('setLogicState() returns false when backend result is not ok', () => {
    let result: unknown;
    service.setLogicState('mylogic', 'enable').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('mylogic'))
      .flush({ result: 'error', description: 'logic failed' });
    expect(result).toBe(false);
  });

  it('setLogicState() returns {} on HTTP error', () => {
    let result: unknown;
    service.setLogicState('mylogic', 'trigger').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('mylogic'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // saveLogicParameters — PUT ?action=saveparameters
  // -------------------------------------------------------------------------

  it('saveLogicParameters() sends PUT with action=saveparameters', () => {
    service.saveLogicParameters('mylogic', { cycle: 10 }).subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('mylogic') && r.url.includes('action=saveparameters'),
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('saveLogicParameters() returns true when backend result is ok', () => {
    let result: unknown;
    service.saveLogicParameters('mylogic', {}).subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('saveparameters')).flush({ result: 'ok' });
    expect(result).toBe(true);
  });

  it('saveLogicParameters() returns false when backend result is not ok', () => {
    let result: unknown;
    service.saveLogicParameters('mylogic', {}).subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('saveparameters'))
      .flush({ result: 'error', description: 'invalid params' });
    expect(result).toBe(false);
  });

  it('saveLogicParameters() returns {} on HTTP error', () => {
    let result: unknown;
    service.saveLogicParameters('mylogic', {}).subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('saveparameters'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // saveLogicGroup — PUT ?action=savegroup
  // -------------------------------------------------------------------------

  it('saveLogicGroup() sends PUT with action=savegroup', () => {
    service.saveLogicGroup('mygroup', { name: 'mygroup' }).subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('mygroup') && r.url.includes('action=savegroup'),
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('saveLogicGroup() returns true when backend result is ok', () => {
    let result: unknown;
    service.saveLogicGroup('mygroup', {}).subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('savegroup')).flush({ result: 'ok' });
    expect(result).toBe(true);
  });

  it('saveLogicGroup() returns false when backend result is not ok', () => {
    let result: unknown;
    service.saveLogicGroup('mygroup', {}).subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('savegroup'))
      .flush({ result: 'error', description: 'group save failed' });
    expect(result).toBe(false);
  });

  it('saveLogicGroup() returns {} on HTTP error', () => {
    let result: unknown;
    service.saveLogicGroup('mygroup', {}).subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('savegroup'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // deleteLogicGroup — PUT ?action=deletegroup
  // -------------------------------------------------------------------------

  it('deleteLogicGroup() sends PUT with action=deletegroup', () => {
    service.deleteLogicGroup('mygroup').subscribe();
    const req = http.expectOne(
      (r) => r.url.includes('mygroup') && r.url.includes('action=deletegroup'),
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('deleteLogicGroup() returns true when backend result is ok', () => {
    let result: unknown;
    service.deleteLogicGroup('mygroup').subscribe((r) => (result = r));
    http.expectOne((r) => r.url.includes('deletegroup')).flush({ result: 'ok' });
    expect(result).toBe(true);
  });

  it('deleteLogicGroup() returns false when backend result is not ok', () => {
    let result: unknown;
    service.deleteLogicGroup('mygroup').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('deletegroup'))
      .flush({ result: 'error', description: 'not found' });
    expect(result).toBe(false);
  });

  it('deleteLogicGroup() returns {} on HTTP error', () => {
    let result: unknown;
    service.deleteLogicGroup('mygroup').subscribe((r) => (result = r));
    http
      .expectOne((r) => r.url.includes('deletegroup'))
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });
});

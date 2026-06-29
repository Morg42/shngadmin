/**
 * ItemsApiService tests
 *
 * Covers:
 *   - getItemList() — GET /api/items/list/
 *     Returns the response; of([]) on HTTP error
 *   - getCoreItemAttributes() — GET /api/items/attributes
 *     Returns the response; of({}) on HTTP error
 *   - getItemTree() — GET /api/items/tree
 *     Returns the response; of([]) on HTTP error
 *   - getItemDetails(itemPath) — GET /api/items/{itemPath}
 *     Returns the response; of([]) on HTTP error
 *   - changeItemValue(itemPath, value) — PUT /api/items/{itemPath}
 *     Sends JSON body { value: ... }; returns the response; of({}) on HTTP error
 *     Tests string, number, and boolean value types
 *   - createItem(itemPath, config, persist?, filename?) — POST /api/items/{itemPath}
 *     Sends JSON body { config, persist, [filename] }; persist defaults to true;
 *     filename is omitted from the body entirely when not given. Returns the
 *     response; errors propagate (no catchError)
 *   - editItem(itemPath, config) — PATCH /api/items/{itemPath}
 *     Sends JSON body { config }; returns the response; errors propagate (no catchError)
 *   - renameItem(itemPath, newPath, filename?) — POST /api/items/{itemPath}/rename
 *     Sends JSON body { new_path, [filename] }; filename omitted from the
 *     body entirely when not given. Returns the response; errors propagate
 *     (no catchError)
 *   - deleteItem(itemPath, persist?) — DELETE /api/items/{itemPath}?persist=...
 *     Sends persist as a query param (not a JSON body — cherrypy doesn't
 *     process DELETE bodies); persist defaults to true. Returns the
 *     response; errors propagate (no catchError)
 *   - getItemReferences(itemPath) — GET /api/items/{itemPath}/references
 *     Returns the response; of(null) on HTTP error
 *   - removeReferences(itemPath) — POST /api/items/{itemPath}/remove_references
 *     Sends an empty body; returns the response; errors propagate (no catchError)
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { ItemsApiService } from './items-api.service';

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

  // -------------------------------------------------------------------------
  // getItemList — GET /api/items/list/
  // -------------------------------------------------------------------------

  it('getItemList() sends GET /api/items/list/', () => {
    service.getItemList().subscribe();
    const req = http.expectOne('/api/items/list/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getItemList() returns the response', () => {
    let result: unknown;
    service.getItemList().subscribe((r) => (result = r));
    http.expectOne('/api/items/list/').flush(['item1', 'item2']);
    expect(result).toEqual(['item1', 'item2']);
  });

  it('getItemList() returns [] on HTTP error', () => {
    let result: unknown;
    service.getItemList().subscribe((r) => (result = r));
    http
      .expectOne('/api/items/list/')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // getItemTree — GET /api/items/tree
  // -------------------------------------------------------------------------

  it('getItemTree() sends GET /api/items/tree', () => {
    service.getItemTree().subscribe();
    const req = http.expectOne('/api/items/tree');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getItemTree() returns the response', () => {
    let result: unknown;
    service.getItemTree().subscribe((r) => (result = r));
    http.expectOne('/api/items/tree').flush({ root: {} });
    expect(result).toEqual({ root: {} });
  });

  it('getItemTree() returns [] on HTTP error', () => {
    let result: unknown;
    service.getItemTree().subscribe((r) => (result = r));
    http
      .expectOne('/api/items/tree')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // getCoreItemAttributes — GET /api/items/attributes
  // -------------------------------------------------------------------------

  it('getCoreItemAttributes() sends GET /api/items/attributes', () => {
    service.getCoreItemAttributes().subscribe();
    const req = http.expectOne('/api/items/attributes');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getCoreItemAttributes() returns the response', () => {
    let result: unknown;
    service.getCoreItemAttributes().subscribe((r) => (result = r));
    http
      .expectOne('/api/items/attributes')
      .flush({ autotimer: { type: 'str' }, type: { type: 'str', valid_list: ['bool', 'str'] } });
    expect(result).toEqual({
      autotimer: { type: 'str' },
      type: { type: 'str', valid_list: ['bool', 'str'] },
    });
  });

  it('getCoreItemAttributes() returns {} on HTTP error', () => {
    let result: unknown;
    service.getCoreItemAttributes().subscribe((r) => (result = r));
    http
      .expectOne('/api/items/attributes')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // getItemDetails — GET /api/items/{itemPath}
  // -------------------------------------------------------------------------

  it('getItemDetails() sends GET /api/items/{itemPath}', () => {
    service.getItemDetails('home.light.switch').subscribe();
    const req = http.expectOne('/api/items/home.light.switch');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getItemDetails() returns the response', () => {
    let result: unknown;
    service.getItemDetails('home.light.switch').subscribe((r) => (result = r));
    http.expectOne('/api/items/home.light.switch').flush({ value: true, type: 'bool' });
    expect(result).toEqual({ value: true, type: 'bool' });
  });

  it('getItemDetails() returns [] on HTTP error', () => {
    let result: unknown;
    service.getItemDetails('missing.item').subscribe((r) => (result = r));
    http
      .expectOne('/api/items/missing.item')
      .flush({ error: 'not found' }, { status: 404, statusText: 'Not Found' });
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // changeItemValue — PUT /api/items/{itemPath}
  // -------------------------------------------------------------------------

  it('changeItemValue() sends PUT /api/items/{itemPath}', () => {
    service.changeItemValue('home.light.switch', true).subscribe();
    const req = http.expectOne('/api/items/home.light.switch');
    expect(req.request.method).toBe('PUT');
    req.flush({ result: 'ok' });
  });

  it('changeItemValue() sends boolean value in body', () => {
    service.changeItemValue('home.light.switch', true).subscribe();
    const req = http.expectOne('/api/items/home.light.switch');
    expect(JSON.parse(req.request.body)).toEqual({ value: true });
    req.flush({ result: 'ok' });
  });

  it('changeItemValue() sends string value in body', () => {
    service.changeItemValue('home.temp', 'warm').subscribe();
    const req = http.expectOne('/api/items/home.temp');
    expect(JSON.parse(req.request.body)).toEqual({ value: 'warm' });
    req.flush({ result: 'ok' });
  });

  it('changeItemValue() sends numeric value in body', () => {
    service.changeItemValue('home.brightness', 75).subscribe();
    const req = http.expectOne('/api/items/home.brightness');
    expect(JSON.parse(req.request.body)).toEqual({ value: 75 });
    req.flush({ result: 'ok' });
  });

  it('changeItemValue() returns the response', () => {
    let result: unknown;
    service.changeItemValue('home.light.switch', false).subscribe((r) => (result = r));
    http.expectOne('/api/items/home.light.switch').flush({ result: 'ok' });
    expect(result).toEqual({ result: 'ok' });
  });

  it('changeItemValue() returns {} on HTTP error', () => {
    let result: unknown;
    service.changeItemValue('home.light.switch', true).subscribe((r) => (result = r));
    http
      .expectOne('/api/items/home.light.switch')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toEqual({});
  });

  // -------------------------------------------------------------------------
  // createItem — POST /api/items/{itemPath}
  // -------------------------------------------------------------------------

  it('createItem() sends POST /api/items/{itemPath} with config and default persist:true in body', () => {
    service.createItem('home.light.switch', { type: 'bool' }).subscribe();
    const req = http.expectOne('/api/items/home.light.switch');
    expect(req.request.method).toBe('POST');
    expect(JSON.parse(req.request.body)).toEqual({ config: { type: 'bool' }, persist: true });
    req.flush({ result: 'ok' });
  });

  it('createItem() sends persist:false when given', () => {
    service.createItem('home.light.switch', { type: 'bool' }, false).subscribe();
    const req = http.expectOne('/api/items/home.light.switch');
    expect(JSON.parse(req.request.body)).toEqual({ config: { type: 'bool' }, persist: false });
    req.flush({ result: 'ok' });
  });

  it('createItem() includes filename in body when given', () => {
    service.createItem('home.light.switch', { type: 'bool' }, true, 'living_room').subscribe();
    const req = http.expectOne('/api/items/home.light.switch');
    expect(JSON.parse(req.request.body)).toEqual({
      config: { type: 'bool' },
      persist: true,
      filename: 'living_room',
    });
    req.flush({ result: 'ok' });
  });

  it('createItem() omits filename from body when not given', () => {
    service.createItem('home.light.switch', { type: 'bool' }).subscribe();
    const req = http.expectOne('/api/items/home.light.switch');
    expect(Object.keys(JSON.parse(req.request.body))).not.toContain('filename');
    req.flush({ result: 'ok' });
  });

  it('createItem() returns the response', () => {
    let result: unknown;
    service.createItem('home.light.switch', { type: 'bool' }).subscribe((r) => (result = r));
    http.expectOne('/api/items/home.light.switch').flush({ result: 'ok' });
    expect(result).toEqual({ result: 'ok' });
  });

  it('createItem() propagates HTTP errors (no catchError)', () => {
    let error: unknown;
    service.createItem('home.light.switch', { type: 'bool' }).subscribe({
      error: (e) => (error = e),
    });
    http
      .expectOne('/api/items/home.light.switch')
      .flush({ error: 'duplicate path' }, { status: 409, statusText: 'Conflict' });
    expect(error).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // editItem — PATCH /api/items/{itemPath}
  // -------------------------------------------------------------------------

  it('editItem() sends PATCH /api/items/{itemPath} with JSON body { config }', () => {
    service.editItem('home.light.switch', { type: 'bool' }).subscribe();
    const req = http.expectOne('/api/items/home.light.switch');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBe(JSON.stringify({ config: { type: 'bool' } }));
    req.flush({ result: 'ok' });
  });

  it('editItem() returns the response', () => {
    let result: unknown;
    service.editItem('home.light.switch', { type: 'bool' }).subscribe((r) => (result = r));
    http.expectOne('/api/items/home.light.switch').flush({ result: 'ok' });
    expect(result).toEqual({ result: 'ok' });
  });

  it('editItem() propagates HTTP errors (no catchError)', () => {
    let error: unknown;
    service.editItem('home.light.switch', { type: 'bool' }).subscribe({
      error: (e) => (error = e),
    });
    http
      .expectOne('/api/items/home.light.switch')
      .flush({ error: 'collision' }, { status: 400, statusText: 'Bad Request' });
    expect(error).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // renameItem — POST /api/items/{itemPath}/rename
  // -------------------------------------------------------------------------

  it('renameItem() sends POST /api/items/{itemPath}/rename with JSON body { new_path }', () => {
    service.renameItem('home.old', 'home.new').subscribe();
    const req = http.expectOne('/api/items/home.old/rename');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(JSON.stringify({ new_path: 'home.new' }));
    req.flush({
      result: 'ok',
      new_path: 'home.new',
      rewritten_references: [],
      failed_references: [],
    });
  });

  it('renameItem() includes filename in the body only when given', () => {
    service.renameItem('home.old', 'home.new', 'custom').subscribe();
    const req = http.expectOne('/api/items/home.old/rename');
    expect(req.request.body).toBe(JSON.stringify({ new_path: 'home.new', filename: 'custom' }));
    req.flush({
      result: 'ok',
      new_path: 'home.new',
      rewritten_references: [],
      failed_references: [],
    });
  });

  it('renameItem() returns the response', () => {
    let result: unknown;
    service.renameItem('home.old', 'home.new').subscribe((r) => (result = r));
    http.expectOne('/api/items/home.old/rename').flush({
      result: 'ok',
      new_path: 'home.new',
      rewritten_references: ['home.other'],
      failed_references: [],
    });
    expect(result).toEqual({
      result: 'ok',
      new_path: 'home.new',
      rewritten_references: ['home.other'],
      failed_references: [],
    });
  });

  it('renameItem() propagates HTTP errors (no catchError)', () => {
    let error: unknown;
    service.renameItem('home.old', 'home.new').subscribe({
      error: (e) => (error = e),
    });
    http
      .expectOne('/api/items/home.old/rename')
      .flush({ error: 'collision' }, { status: 400, statusText: 'Bad Request' });
    expect(error).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // deleteItem — DELETE /api/items/{itemPath}
  // -------------------------------------------------------------------------

  it('deleteItem() sends DELETE /api/items/{itemPath}?persist=true by default', () => {
    service.deleteItem('home.light.switch').subscribe();
    const req = http.expectOne('/api/items/home.light.switch?persist=true');
    expect(req.request.method).toBe('DELETE');
    req.flush({ result: 'ok' });
  });

  it('deleteItem() sends persist=false as a query param when given', () => {
    service.deleteItem('home.light.switch', false).subscribe();
    const req = http.expectOne('/api/items/home.light.switch?persist=false');
    req.flush({ result: 'ok' });
  });

  it('deleteItem() returns the response', () => {
    let result: unknown;
    service.deleteItem('home.light.switch').subscribe((r) => (result = r));
    http.expectOne('/api/items/home.light.switch?persist=true').flush({ result: 'ok' });
    expect(result).toEqual({ result: 'ok' });
  });

  it('deleteItem() propagates HTTP errors (no catchError)', () => {
    let error: unknown;
    service.deleteItem('home.light.switch').subscribe({
      error: (e) => (error = e),
    });
    http
      .expectOne('/api/items/home.light.switch?persist=true')
      .flush({ error: 'refused' }, { status: 409, statusText: 'Conflict' });
    expect(error).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // getItemReferences — GET /api/items/{itemPath}/references
  // -------------------------------------------------------------------------

  it('getItemReferences() sends GET /api/items/{itemPath}/references', () => {
    service.getItemReferences('home.light.switch').subscribe();
    const req = http.expectOne('/api/items/home.light.switch/references');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getItemReferences() returns the response', () => {
    let result: unknown;
    service.getItemReferences('home.light.switch').subscribe((r) => (result = r));
    http.expectOne('/api/items/home.light.switch/references').flush([
      {
        item: 'home.other',
        attribute: 'eval',
        value: 'sh.home.light.switch()',
        unambiguous: true,
      },
    ]);
    expect(result).toEqual([
      { item: 'home.other', attribute: 'eval', value: 'sh.home.light.switch()', unambiguous: true },
    ]);
  });

  it('getItemReferences() returns null on HTTP error', () => {
    let result: unknown;
    service.getItemReferences('home.light.switch').subscribe((r) => (result = r));
    http
      .expectOne('/api/items/home.light.switch/references')
      .flush({ error: 'err' }, { status: 500, statusText: 'Server Error' });
    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // removeReferences — POST /api/items/{itemPath}/remove_references
  // -------------------------------------------------------------------------

  it('removeReferences() sends POST /api/items/{itemPath}/remove_references', () => {
    service.removeReferences('home.light.switch').subscribe();
    const req = http.expectOne('/api/items/home.light.switch/remove_references');
    expect(req.request.method).toBe('POST');
    req.flush({ removed: [], skipped_ambiguous: [] });
  });

  it('removeReferences() returns the response', () => {
    let result: unknown;
    service.removeReferences('home.light.switch').subscribe((r) => (result = r));
    http.expectOne('/api/items/home.light.switch/remove_references').flush({
      removed: [['home.other', ['eval']]],
      skipped_ambiguous: [],
    });
    expect(result).toEqual({
      removed: [['home.other', ['eval']]],
      skipped_ambiguous: [],
    });
  });

  it('removeReferences() propagates HTTP errors (no catchError)', () => {
    let error: unknown;
    service.removeReferences('home.light.switch').subscribe({
      error: (e) => (error = e),
    });
    http
      .expectOne('/api/items/home.light.switch/remove_references')
      .flush({ error: 'failed' }, { status: 500, statusText: 'Server Error' });
    expect(error).toBeTruthy();
  });
});

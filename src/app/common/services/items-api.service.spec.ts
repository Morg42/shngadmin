/**
 * ItemsApiService tests
 *
 * Covers:
 *   - getItemList() — GET /api/items/list/
 *     Returns the response; of([]) on HTTP error
 *   - getItemTree() — GET /api/items/tree
 *     Returns the response; of([]) on HTTP error
 *   - getItemDetails(itemPath) — GET /api/items/{itemPath}
 *     Returns the response; of([]) on HTTP error
 *   - changeItemValue(itemPath, value) — PUT /api/items/{itemPath}
 *     Sends JSON body { value: ... }; returns the response; of({}) on HTTP error
 *     Tests string, number, and boolean value types
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
});

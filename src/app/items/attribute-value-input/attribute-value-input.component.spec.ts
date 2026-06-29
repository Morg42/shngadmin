import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ItemsApiService } from '../../common/services/items-api.service';
import { AttributeValueInputComponent } from './attribute-value-input.component';

describe('AttributeValueInputComponent', () => {
  let component: AttributeValueInputComponent;
  let fixture: ComponentFixture<AttributeValueInputComponent>;
  let mockItemsApi: { getItemList: jest.Mock };

  beforeEach(async () => {
    mockItemsApi = {
      getItemList: jest.fn().mockReturnValue(of(['home.light', 'home.sensor'])),
    };

    await TestBed.configureTestingModule({
      imports: [AttributeValueInputComponent],
      providers: [{ provide: ItemsApiService, useValue: mockItemsApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(AttributeValueInputComponent);
    component = fixture.componentInstance;
  });

  // ---------------------------------------------------------------------
  // inputKind — control selection
  // ---------------------------------------------------------------------

  it('picks "select" when a valid_list is given, regardless of type', () => {
    component.type = 'str';
    component.validList = ['a', 'b'];
    expect(component.inputKind).toBe('select');
  });

  it('picks "toggle" for bool', () => {
    component.type = 'bool';
    expect(component.inputKind).toBe('toggle');
  });

  it('picks "list" for list and list(subtype) alike', () => {
    component.type = 'list';
    expect(component.inputKind).toBe('list');
    component.type = 'list(num)';
    expect(component.inputKind).toBe('list');
  });

  it('picks "dict" for dict', () => {
    component.type = 'dict';
    expect(component.inputKind).toBe('dict');
  });

  it('picks "password" for password', () => {
    component.type = 'password';
    expect(component.inputKind).toBe('password');
  });

  it('picks "number" for int/float/num/scene', () => {
    for (const t of ['int', 'float', 'num', 'scene']) {
      component.type = t;
      expect(component.inputKind).toBe('number');
    }
  });

  it('picks "autocomplete" for str', () => {
    component.type = 'str';
    expect(component.inputKind).toBe('autocomplete');
  });

  it('falls back to "text" for unmapped types (foo, ip, mac, knx_ga, ...)', () => {
    for (const t of ['foo', 'ip', 'ipv4', 'ipv6', 'mac', 'knx_ga']) {
      component.type = t;
      expect(component.inputKind).toBe('text');
    }
  });

  // ---------------------------------------------------------------------
  // list editor
  // ---------------------------------------------------------------------

  it('ngOnChanges seeds listRows from an existing array value', () => {
    component.value = ['a', 'b'];
    component.ngOnChanges({ value: {} as never });
    expect(component.listRows).toEqual(['a', 'b']);
  });

  it('ngOnChanges parses a legacy JSON-array string into listRows', () => {
    component.value = '["a", "b"]';
    component.ngOnChanges({ value: {} as never });
    expect(component.listRows).toEqual(['a', 'b']);
  });

  it('ngOnChanges treats a non-JSON legacy string as a single row, not dropped', () => {
    component.value = 'not json';
    component.ngOnChanges({ value: {} as never });
    expect(component.listRows).toEqual(['not json']);
  });

  it('addListRow()/removeListRow()/updateListRow() mutate and emit the array', () => {
    component.value = ['a'];
    component.ngOnChanges({ value: {} as never });
    let emitted: unknown;
    component.valueChange.subscribe((v) => (emitted = v));

    component.addListRow();
    expect(component.listRows).toEqual(['a', '']);
    expect(emitted).toEqual(['a', '']);

    component.updateListRow(1, 'b');
    expect(emitted).toEqual(['a', 'b']);

    component.removeListRow(0);
    expect(component.listRows).toEqual(['b']);
    expect(emitted).toEqual(['b']);
  });

  // ---------------------------------------------------------------------
  // dict editor
  // ---------------------------------------------------------------------

  it('ngOnChanges seeds dictRows from an existing object value', () => {
    component.value = { a: 1, b: 'x' };
    component.ngOnChanges({ value: {} as never });
    expect(component.dictRows).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'x' },
    ]);
  });

  it('ngOnChanges parses a legacy JSON-object string into dictRows', () => {
    component.value = '{"a": "1"}';
    component.ngOnChanges({ value: {} as never });
    expect(component.dictRows).toEqual([{ key: 'a', value: '1' }]);
  });

  it('addDictRow()/updateDictRowKey()/updateDictRowValue()/removeDictRow() mutate and emit an object, skipping empty keys', () => {
    component.value = {};
    component.ngOnChanges({ value: {} as never });
    let emitted: unknown;
    component.valueChange.subscribe((v) => (emitted = v));

    component.addDictRow();
    component.updateDictRowKey(0, 'k');
    component.updateDictRowValue(0, 'v');
    expect(emitted).toEqual({ k: 'v' });

    component.addDictRow(); // second row left with an empty key
    expect(emitted).toEqual({ k: 'v' }); // empty-key row excluded from the emitted object

    component.removeDictRow(0);
    expect(emitted).toEqual({});
  });

  // ---------------------------------------------------------------------
  // item-path autocomplete
  // ---------------------------------------------------------------------

  it('searchItemPaths() lazily loads the item list once, then filters locally', () => {
    component.searchItemPaths({ query: 'light' });
    expect(mockItemsApi.getItemList).toHaveBeenCalledTimes(1);
    expect(component.filteredItemPaths).toEqual(['home.light']);

    component.searchItemPaths({ query: 'sensor' });
    expect(mockItemsApi.getItemList).toHaveBeenCalledTimes(1); // not called again
    expect(component.filteredItemPaths).toEqual(['home.sensor']);
  });
});

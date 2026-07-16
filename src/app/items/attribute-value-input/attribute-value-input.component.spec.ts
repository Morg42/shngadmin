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
    fixture.componentRef.setInput('type', 'str');
    fixture.componentRef.setInput('validList', ['a', 'b']);
    expect(component.inputKind).toBe('select');
  });

  it('picks "toggle" for bool', () => {
    fixture.componentRef.setInput('type', 'bool');
    expect(component.inputKind).toBe('toggle');
  });

  it('picks "list" for list and list(subtype) alike', () => {
    fixture.componentRef.setInput('type', 'list');
    expect(component.inputKind).toBe('list');
    fixture.componentRef.setInput('type', 'list(num)');
    expect(component.inputKind).toBe('list');
  });

  it('picks "dict" for dict', () => {
    fixture.componentRef.setInput('type', 'dict');
    expect(component.inputKind).toBe('dict');
  });

  it('picks "password" for password', () => {
    fixture.componentRef.setInput('type', 'password');
    expect(component.inputKind).toBe('password');
  });

  it('picks "number" for int/float/num/scene', () => {
    for (const t of ['int', 'float', 'num', 'scene']) {
      fixture.componentRef.setInput('type', t);
      expect(component.inputKind).toBe('number');
    }
  });

  it('picks "autocomplete" for str', () => {
    fixture.componentRef.setInput('type', 'str');
    expect(component.inputKind).toBe('autocomplete');
  });

  it('falls back to "text" for unmapped types (foo, ip, mac, knx_ga, ...)', () => {
    for (const t of ['foo', 'ip', 'ipv4', 'ipv6', 'mac', 'knx_ga']) {
      fixture.componentRef.setInput('type', t);
      expect(component.inputKind).toBe('text');
    }
  });

  // ---------------------------------------------------------------------
  // list editor
  // ---------------------------------------------------------------------

  it('seeds listRows from an existing array value', () => {
    fixture.componentRef.setInput('value', ['a', 'b']);
    expect(component.listRows()).toEqual(['a', 'b']);
  });

  it('parses a legacy JSON-array string into listRows', () => {
    fixture.componentRef.setInput('value', '["a", "b"]');
    expect(component.listRows()).toEqual(['a', 'b']);
  });

  it('treats a non-JSON legacy string as a single row, not dropped', () => {
    fixture.componentRef.setInput('value', 'not json');
    expect(component.listRows()).toEqual(['not json']);
  });

  it('addListRow()/removeListRow()/updateListRow() mutate and emit the array', () => {
    fixture.componentRef.setInput('value', ['a']);
    let emitted: unknown;
    component.valueChange.subscribe((v) => (emitted = v));

    component.addListRow();
    expect(component.listRows()).toEqual(['a', '']);
    expect(emitted).toEqual(['a', '']);

    component.updateListRow(1, 'b');
    expect(emitted).toEqual(['a', 'b']);

    component.removeListRow(0);
    expect(component.listRows()).toEqual(['b']);
    expect(emitted).toEqual(['b']);
  });

  // ---------------------------------------------------------------------
  // dict editor
  // ---------------------------------------------------------------------

  it('seeds dictRows from an existing object value', () => {
    fixture.componentRef.setInput('value', { a: 1, b: 'x' });
    expect(component.dictRows()).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'x' },
    ]);
  });

  it('parses a legacy JSON-object string into dictRows', () => {
    fixture.componentRef.setInput('value', '{"a": "1"}');
    expect(component.dictRows()).toEqual([{ key: 'a', value: '1' }]);
  });

  it('addDictRow()/updateDictRowKey()/updateDictRowValue()/removeDictRow() mutate and emit an object, skipping empty keys', () => {
    fixture.componentRef.setInput('value', {});
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
    expect(component.filteredItemPaths()).toEqual(['home.light']);

    component.searchItemPaths({ query: 'sensor' });
    expect(mockItemsApi.getItemList).toHaveBeenCalledTimes(1); // not called again
    expect(component.filteredItemPaths()).toEqual(['home.sensor']);
  });
});

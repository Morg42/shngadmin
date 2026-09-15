import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigParameter, TableColumn } from '../../models/interfaces';
import { DynamicFieldComponent } from './dynamic-field.component';

describe('DynamicFieldComponent', () => {
  let fixture: ComponentFixture<DynamicFieldComponent>;
  let component: DynamicFieldComponent;

  const col: TableColumn = { field: 'value', header: 'Value' };

  function setRow(row: ConfigParameter) {
    fixture.componentRef.setInput('row', row);
    fixture.componentRef.setInput('col', col);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFieldComponent);
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // placeholder: p-select's internal label computation does
  // `placeholder() || 'p-emptylabel'` - a placeholder that is itself a falsy
  // *value* (not just an empty string) renders as nothing. default must
  // always come through as a real string, regardless of its original type.
  // -------------------------------------------------------------------------

  it('renders a boolean false default as the string "false", not nothing', () => {
    setRow({ name: 'dark_mode', value: null, default: false, type: 'bool' });
    expect(component.placeholder).toBe('false');
  });

  it('renders a boolean true default as the string "true"', () => {
    setRow({ name: 'login_autorenew', value: null, default: true, type: 'bool' });
    expect(component.placeholder).toBe('true');
  });

  it('renders a numeric 0 default as the string "0", not nothing', () => {
    setRow({ name: 'itemtree_searchstart', value: null, default: 0, type: 'int' });
    expect(component.placeholder).toBe('0');
  });

  it('returns undefined when there is no default at all', () => {
    setRow({ name: 'no_default', value: null, default: undefined, type: 'str' });
    expect(component.placeholder).toBeUndefined();
  });

  it('passes a string default through unchanged', () => {
    setRow({ name: 'resource_graph_period', value: null, default: '24h', type: 'str' });
    expect(component.placeholder).toBe('24h');
  });

  // -------------------------------------------------------------------------
  // inputKind: a bool-typed parameter always resolves to 'select' - either
  // from its own valid_list, or from resolveSelectOptions() synthesizing
  // true/false when it doesn't have one. Rows here are never deletable, so
  // the select's clear (x) is the only way to represent "not set".
  // -------------------------------------------------------------------------

  it('resolves a bool parameter with an explicit valid_list to the select kind', () => {
    setRow({
      name: 'dark_mode',
      value: null,
      default: false,
      type: 'bool',
      valid_list: [
        { label: 'true', value: true },
        { label: 'false', value: false },
      ],
    });
    expect(component.inputKind).toBe('select');
  });

  it('resolves a bool parameter with no valid_list to the select kind too', () => {
    setRow({ name: 'dark_mode', value: null, default: false, type: 'bool' });
    expect(component.inputKind).toBe('select');
    expect(component.selectOptions).toEqual([
      { label: 'true', value: true },
      { label: 'false', value: false },
    ]);
  });

  it('resolves a genuine password parameter to the password kind', () => {
    setRow({ name: 'api_key', value: null, default: '', type: 'password' });
    expect(component.inputKind).toBe('password');
  });

  it('resolves a list-typed parameter to plain text (no list editor in this table)', () => {
    setRow({ name: 'hosts', value: null, default: [], type: 'list' });
    expect(component.inputKind).toBe('text');
  });
});

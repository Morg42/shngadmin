import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { suppressBrowserTypeaheadOnSelect } from './select-typeahead';

@Component({
  imports: [FormsModule, Select],
  template: `
    <p-select [options]="options" [(ngModel)]="value" />
    <p-select [options]="options" [(ngModel)]="value" [editable]="true" />
    <input id="plain" type="text" />
  `,
})
class HostComponent {
  options = ['alpha', 'beta', 'gamma'];
  value: string | null = null;
}

describe('suppressBrowserTypeaheadOnSelect', () => {
  let fixture: ComponentFixture<HostComponent>;
  let removeListener: () => void;

  function press(target: Element, init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    removeListener = suppressBrowserTypeaheadOnSelect(document);
  });

  afterEach(() => {
    removeListener();
    fixture.nativeElement.remove();
  });

  function combobox(): HTMLElement {
    const el = fixture.nativeElement.querySelector('p-select span[role="combobox"]');
    if (!el) {
      throw new Error('non-editable select combobox not rendered');
    }
    return el;
  }

  it('blocks the browser default for a printable key on a select', () => {
    expect(press(combobox(), { key: 'b', code: 'KeyB' }).defaultPrevented).toBe(true);
  });

  it("leaves the select's own type-ahead working", () => {
    const select = fixture.debugElement.children[0].componentInstance as Select;
    const combo = combobox();
    combo.focus();
    press(combo, { key: 'g', code: 'KeyG' });
    expect(select.searchValue).toBe('g');
  });

  it.each([
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['alt', { altKey: true }],
  ])('keeps %s shortcuts (e.g. ctrl+F) untouched', (_name, modifier) => {
    expect(press(combobox(), { key: 'f', code: 'KeyF', ...modifier }).defaultPrevented).toBe(false);
  });

  it('keeps non-printable keys untouched', () => {
    expect(press(combobox(), { key: 'Tab', code: 'Tab' }).defaultPrevented).toBe(false);
    expect(press(combobox(), { key: 'F5', code: 'F5' }).defaultPrevented).toBe(false);
  });

  it("keeps typing in an editable select's text input", () => {
    const input = fixture.nativeElement.querySelectorAll('p-select')[1].querySelector('input');
    expect(press(input, { key: 'a', code: 'KeyA' }).defaultPrevented).toBe(false);
  });

  it('keeps typing in a plain input', () => {
    const input = fixture.nativeElement.querySelector('#plain');
    expect(press(input, { key: 'a', code: 'KeyA' }).defaultPrevented).toBe(false);
  });

  it('stops listening once removed', () => {
    removeListener();
    expect(press(combobox(), { key: 'b', code: 'KeyB' }).defaultPrevented).toBe(false);
  });
});

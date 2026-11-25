import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DecimalInputDirective } from './decimal-input.directive';

@Component({
  imports: [FormsModule, DecimalInputDirective],
  template: `<input appDecimalInput [(ngModel)]="value" />`,
})
class HostComponent {
  value: number | null = null;
}

describe('DecimalInputDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let input: HTMLInputElement;

  async function render(initial: number | null = null) {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.value = initial;
    fixture.detectChanges();
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
  }

  function type(text: string) {
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));

  it('shows a stored value at full precision', async () => {
    await render(53.603133);
    expect(input.value).toBe('53.603133');
  });

  it('shows nothing for a null value', async () => {
    await render(null);
    expect(input.value).toBe('');
  });

  it('accepts a point as the decimal sign', async () => {
    await render();
    type('53.6');
    expect(host.value).toBe(53.6);
  });

  it('accepts a comma as the decimal sign and normalises it to a point', async () => {
    await render();
    type('53,6');
    expect(host.value).toBe(53.6);
    expect(input.value).toBe('53.6');
  });

  it('accepts negative values', async () => {
    await render();
    type('-7,3153');
    expect(host.value).toBe(-7.3153);
  });

  it('keeps a trailing decimal sign while typing', async () => {
    await render();
    type('53.');
    expect(host.value).toBe(53);
    expect(input.value).toBe('53.');
  });

  it('emits null for empty and for a lone sign', async () => {
    await render(5);
    for (const text of ['', '-', '.', '-.']) {
      type(text);
      expect(host.value).toBeNull();
    }
  });

  it('rejects input that is not a decimal number and restores the previous text', async () => {
    await render();
    type('53.6');
    for (const bad of ['53.6a', '1.234.5', '1,234.5', '--1', '5-']) {
      type(bad);
      expect(input.value).toBe('53.6');
      expect(host.value).toBe(53.6);
    }
  });

  it('rewrites the text from the model value on blur', async () => {
    await render();
    type('53.');
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('53');
    type('-');
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('');
  });

  it('follows programmatic model changes', async () => {
    await render(1.5);
    host.value = 2.25;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.value).toBe('2.25');
  });
});

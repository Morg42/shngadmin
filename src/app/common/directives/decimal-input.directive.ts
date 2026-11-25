import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Optional minus, digits, at most one decimal point; every prefix of a
 *  valid number matches, so a half-typed value ('-', '53.') is accepted. */
const PARTIAL_DECIMAL = /^-?\d*\.?\d*$/;

/** Text input bound to a `number | null` model that takes either '.' or ','
 *  as the decimal sign and always shows '.'. Input that is not a decimal
 *  number is rejected and the previous text is restored. Min/max are not
 *  enforced here; they are checked at submit time by validateValue(). */
@Directive({
  selector: 'input[appDecimalInput]',
  host: {
    inputmode: 'decimal',
    '(input)': 'onInput()',
    '(blur)': 'onBlur()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DecimalInputDirective),
      multi: true,
    },
  ],
})
export class DecimalInputDirective implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private lastText = '';
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: number | null | undefined): void {
    this.setText(value === null || value === undefined ? '' : String(value));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.el.disabled = disabled;
  }

  onInput(): void {
    const text = this.el.value.replace(',', '.');
    if (!PARTIAL_DECIMAL.test(text)) {
      this.setText(this.lastText);
      return;
    }
    this.setText(text);
    this.onChange(this.parsed());
  }

  onBlur(): void {
    const value = this.parsed();
    this.setText(value === null ? '' : String(value));
    this.onTouched();
  }

  /** null while the text is empty or has no digits yet ('-', '.', '-.'). */
  private parsed(): number | null {
    const value = Number.parseFloat(this.lastText);
    return Number.isFinite(value) ? value : null;
  }

  private setText(text: string): void {
    this.lastText = text;
    this.el.value = text;
  }
}

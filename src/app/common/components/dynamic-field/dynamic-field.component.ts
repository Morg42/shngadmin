import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Bind } from 'primeng/bind';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { NgStyle } from '@angular/common';

@Component({
    selector: 'app-dynamic-field',
    templateUrl: './dynamic-field.component.html',
    imports: [
        Bind,
        Select,
        FormsModule,
        InputText,
        NgStyle,
    ],
})
export class DynamicFieldComponent {
  @Input() row: any;
  @Input() col: any;
  @Output() changed = new EventEmitter<void>();

  readonly NUM_TYPES = ['int', 'num', 'float', 'scene', 'hide-int'];

  get inputKind(): string {
    const { type, gui_type, valid_list } = this.row;
    if (valid_list?.length > 0) return 'select';
    if (this.NUM_TYPES.includes(type)) return 'number';
    if (type === 'hide-str') return 'password';
    if (type === 'bool' || type === 'password') return 'none';
    if (gui_type === 'readonly') return 'text-readonly';
    if (gui_type === 'wide_str') return 'text-wide';
    return 'text';
  }

  onChanged(): void {
    this.changed.emit();
  }
}

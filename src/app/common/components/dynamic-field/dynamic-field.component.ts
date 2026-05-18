import { NgStyle } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ConfigParameter, TableColumn } from '../../models/interfaces';

@Component({
  selector: 'app-dynamic-field',
  templateUrl: './dynamic-field.component.html',
  imports: [Bind, Select, FormsModule, InputText, NgStyle],
})
export class DynamicFieldComponent {
  @Input() row!: ConfigParameter;
  @Input() col!: TableColumn;
  @Output() changed = new EventEmitter<void>();

  readonly NUM_TYPES = ['int', 'num', 'float', 'scene', 'hide-int'];

  get placeholder(): string | undefined {
    return this.row.default as string | undefined;
  }

  get validMin(): string | number | null {
    return (this.row.valid_min as string | number | null) ?? null;
  }

  get validMax(): string | number | null {
    return (this.row.valid_max as string | number | null) ?? null;
  }

  get inputKind(): string {
    const { type, gui_type, valid_list } = this.row;
    if ((valid_list?.length ?? 0) > 0) return 'select';
    if (type && this.NUM_TYPES.includes(type)) return 'number';
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

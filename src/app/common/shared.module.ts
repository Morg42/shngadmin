import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Select } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { DynamicFieldComponent } from './components/dynamic-field/dynamic-field.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        NgOptimizedImage,
        TranslateModule.forChild(),
        Select,
        InputTextModule,
        DynamicFieldComponent,
    ],
    exports: [
        CommonModule,
        FormsModule,
        RouterModule,
        NgOptimizedImage,
        TranslateModule,
        DynamicFieldComponent,
    ],
})
export class SharedModule {}

import { NgModule } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { Dialog } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { ListboxModule } from 'primeng/listbox';
import { Select } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { SharedModule } from '../common/shared.module';
import { ServicesRoutingModule } from './services-routing.module';
import { ServicesComponent } from './services.component';
import { FunctionConfigurationComponent } from './function-configuration/function-configuration.component';

@NgModule({
    imports: [
        SharedModule,
        ServicesRoutingModule,
        CodemirrorModule,
        TabsModule,
        Dialog,
        FileUploadModule,
        ListboxModule,
        Select,
        InputTextModule,
        ButtonModule,
        ServicesComponent,
        FunctionConfigurationComponent,
    ],
})
export class ServicesModule {}

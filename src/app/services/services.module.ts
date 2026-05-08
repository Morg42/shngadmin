import { NgModule } from '@angular/core';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ModalModule } from 'ngx-bootstrap/modal';
import { Dialog } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { ListboxModule } from 'primeng/listbox';
import { Select } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

import { SharedModule } from '../common/shared.module';
import { ServicesRoutingModule } from './services-routing.module';
import { ServicesComponent } from './services.component';
import { FunctionConfigurationComponent } from './function-configuration/function-configuration.component';

@NgModule({
  declarations: [
    ServicesComponent,
    FunctionConfigurationComponent,
  ],
  imports: [
    SharedModule,
    ServicesRoutingModule,
    TabsModule,
    ModalModule,
    Dialog,
    FileUploadModule,
    ListboxModule,
    Select,
    InputTextModule,
    ButtonModule,
  ],
})
export class ServicesModule {}

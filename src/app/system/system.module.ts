import { NgModule } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ButtonModule } from 'primeng/button';

import { SharedModule } from '../common/shared.module';
import { SystemRoutingModule } from './system-routing.module';
import { SystemComponent } from './system-overview/system.component';
import { SystemConfigComponent } from './system-config/system-config.component';

@NgModule({
  declarations: [
    SystemComponent,
    SystemConfigComponent,
  ],
  imports: [
    SharedModule,
    SystemRoutingModule,
    FontAwesomeModule,
    TabsModule,
    ChartModule,
    TableModule,
    Dialog,
    Select,
    InputTextModule,
    ToggleButtonModule,
    ButtonModule,
  ],
})
export class SystemModule {}

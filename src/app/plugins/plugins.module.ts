import { NgModule } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ModalModule } from 'ngx-bootstrap/modal';
import { AccordionModule } from 'primeng/accordion';
import { Dialog } from 'primeng/dialog';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { SharedModule } from '../common/shared.module';
import { PluginsRoutingModule } from './plugins-routing.module';
import { PluginsComponent } from './plugin-list/plugins.component';
import { PluginConfigComponent } from './config/plugin-config.component';

@NgModule({
  declarations: [
    PluginsComponent,
    PluginConfigComponent,
  ],
  imports: [
    SharedModule,
    PluginsRoutingModule,
    FontAwesomeModule,
    ModalModule,
    AccordionModule,
    Dialog,
    ToggleSwitch,
    ProgressSpinnerModule,
    Select,
    TableModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
  ],
})
export class PluginsModule {}

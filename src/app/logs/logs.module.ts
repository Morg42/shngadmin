import { NgModule } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { SharedModule } from '../common/shared.module';
import { LogsRoutingModule } from './logs-routing.module';
import { LogDisplayComponent } from './log-display/log-display.component';
import { LoggerListComponent } from './logger-list/logger-list.component';
import { LoggingConfigurationComponent } from './logging-configuration/logging-configuration.component';
import { LoggerLineComponent } from './logger-line/logger-line.component';
import { LoggerTabComponent } from './logger-tab/logger-tab.component';

@NgModule({
  declarations: [
    LogDisplayComponent,
    LoggerListComponent,
    LoggingConfigurationComponent,
    LoggerLineComponent,
    LoggerTabComponent,
  ],
  imports: [
    SharedModule,
    LogsRoutingModule,
    CodemirrorModule,
    FontAwesomeModule,
    TabsModule,
    Checkbox,
    Dialog,
    ProgressSpinnerModule,
    Select,
    InputTextModule,
    ButtonModule,
    TooltipModule,
  ],
})
export class LogsModule {}

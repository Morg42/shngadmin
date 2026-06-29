import { Routes } from '@angular/router';
import { LogDisplayComponent } from './log-display/log-display.component';
import { LoggerListComponent } from './logger-list/logger-list.component';
import { LoggingConfigurationComponent } from './logging-configuration/logging-configuration.component';

export const LOGS_ROUTES: Routes = [
  { path: '', component: LogDisplayComponent },
  {
    path: 'display',
    component: LogDisplayComponent,
  },
  {
    path: 'display/:logname',
    component: LogDisplayComponent,
  },
  {
    path: 'logger-list',
    component: LoggerListComponent,
  },
  {
    path: 'logging-configuration',
    component: LoggingConfigurationComponent,
  },
];

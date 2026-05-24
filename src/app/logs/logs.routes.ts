import { Routes } from '@angular/router';
import { appReadyGuard } from '../common/guards/app-ready.guard';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { LogDisplayComponent } from './log-display/log-display.component';
import { LoggerListComponent } from './logger-list/logger-list.component';
import { LoggingConfigurationComponent } from './logging-configuration/logging-configuration.component';

export const LOGS_ROUTES: Routes = [
  { path: '', component: LogDisplayComponent, canActivate: [appReadyGuard, AuthGuardService] },
  {
    path: 'display',
    component: LogDisplayComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
  {
    path: 'display/:logname',
    component: LogDisplayComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
  {
    path: 'logger-list',
    component: LoggerListComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
  {
    path: 'logging-configuration',
    component: LoggingConfigurationComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
];

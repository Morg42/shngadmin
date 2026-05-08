import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { LogDisplayComponent } from './log-display/log-display.component';
import { LoggerListComponent } from './logger-list/logger-list.component';
import { LoggingConfigurationComponent } from './logging-configuration/logging-configuration.component';

const routes: Routes = [
  { path: '', component: LogDisplayComponent, canActivate: [AuthGuardService] },
  { path: 'display', component: LogDisplayComponent, canActivate: [AuthGuardService] },
  { path: 'display/:logname', component: LogDisplayComponent, canActivate: [AuthGuardService] },
  { path: 'logger-list', component: LoggerListComponent, canActivate: [AuthGuardService] },
  { path: 'logging-configuration', component: LoggingConfigurationComponent, canActivate: [AuthGuardService] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LogsRoutingModule {}

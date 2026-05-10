import { Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { SystemComponent } from './system-overview/system.component';
import { SystemConfigComponent } from './system-config/system-config.component';

export const SYSTEM_ROUTES: Routes = [
  { path: '', component: SystemComponent, canActivate: [AuthGuardService] },
  { path: 'systemproperties', component: SystemComponent, canActivate: [AuthGuardService] },
  { path: 'config', component: SystemConfigComponent, canActivate: [AuthGuardService] },
];

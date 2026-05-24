import { Routes } from '@angular/router';
import { appReadyGuard } from '../common/guards/app-ready.guard';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { SystemConfigComponent } from './system-config/system-config.component';
import { SystemComponent } from './system-overview/system.component';

export const SYSTEM_ROUTES: Routes = [
  { path: '', component: SystemComponent, canActivate: [appReadyGuard, AuthGuardService] },
  {
    path: 'systemproperties',
    component: SystemComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
  {
    path: 'config',
    component: SystemConfigComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
];

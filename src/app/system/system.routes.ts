import { Routes } from '@angular/router';
import { SystemConfigComponent } from './system-config/system-config.component';
import { SystemComponent } from './system-overview/system.component';

export const SYSTEM_ROUTES: Routes = [
  { path: '', component: SystemComponent },
  {
    path: 'systemproperties',
    component: SystemComponent,
  },
  {
    path: 'config',
    component: SystemConfigComponent,
  },
];

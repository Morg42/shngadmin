import { Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { PluginConfigComponent } from './config/plugin-config.component';
import { PluginsComponent } from './plugin-list/plugins.component';

export const PLUGINS_ROUTES: Routes = [
  { path: '', component: PluginsComponent, canActivate: [AuthGuardService] },
  { path: 'config', component: PluginConfigComponent, canActivate: [AuthGuardService] },
];

import { Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { PluginsComponent } from './plugin-list/plugins.component';
import { PluginConfigComponent } from './config/plugin-config.component';

export const PLUGINS_ROUTES: Routes = [
  { path: '', component: PluginsComponent, canActivate: [AuthGuardService] },
  { path: 'config', component: PluginConfigComponent, canActivate: [AuthGuardService] },
];

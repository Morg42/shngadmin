import { Routes } from '@angular/router';
import { PluginConfigComponent } from './config/plugin-config.component';
import { PluginsComponent } from './plugin-list/plugins.component';

export const PLUGINS_ROUTES: Routes = [
  { path: '', component: PluginsComponent },
  {
    path: 'config',
    component: PluginConfigComponent,
  },
];

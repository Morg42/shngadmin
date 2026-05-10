import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { NotFoundComponent } from './not-found/not-found.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'system', pathMatch: 'full' },

  {
    path: 'system',
    loadChildren: () => import('./system/system.routes').then((r) => r.SYSTEM_ROUTES),
  },
  {
    path: 'services',
    loadChildren: () => import('./services/services.routes').then((r) => r.SERVICES_ROUTES),
  },

  { path: 'item_tree', redirectTo: 'items', pathMatch: 'full' },
  { path: 'items', loadChildren: () => import('./items/items.routes').then((r) => r.ITEMS_ROUTES) },

  { path: 'logics-list', redirectTo: 'logics/list', pathMatch: 'full' },
  { path: 'logics-groups', redirectTo: 'logics/groups', pathMatch: 'full' },
  {
    path: 'logics',
    loadChildren: () => import('./logics/logics.routes').then((r) => r.LOGICS_ROUTES),
  },

  { path: 'threads', redirectTo: 'schedulers/threads', pathMatch: 'full' },
  {
    path: 'schedulers',
    loadChildren: () => import('./schedulers/schedulers.routes').then((r) => r.SCHEDULERS_ROUTES),
  },

  { path: 'plugins_list', redirectTo: 'plugins', pathMatch: 'full' },
  {
    path: 'plugins',
    loadChildren: () => import('./plugins/plugins.routes').then((r) => r.PLUGINS_ROUTES),
  },

  {
    path: 'scenes',
    loadChildren: () => import('./scenes/scenes.routes').then((r) => r.SCENES_ROUTES),
  },
  { path: 'logs', loadChildren: () => import('./logs/logs.routes').then((r) => r.LOGS_ROUTES) },

  { path: 'login', component: LoginComponent },
  { path: '**', component: NotFoundComponent },
];

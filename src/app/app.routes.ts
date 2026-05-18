import { Routes } from '@angular/router';
import { appReadyGuard } from './common/guards/app-ready.guard';
import { authGuard } from './common/guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { NotFoundComponent } from './not-found/not-found.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'system', pathMatch: 'full' },

  {
    path: 'system',
    canActivate: [appReadyGuard, authGuard],
    loadChildren: () => import('./system/system.routes').then((r) => r.SYSTEM_ROUTES),
  },
  {
    path: 'services',
    canActivate: [appReadyGuard, authGuard],
    loadChildren: () => import('./services/services.routes').then((r) => r.SERVICES_ROUTES),
  },

  { path: 'item_tree', redirectTo: 'items', pathMatch: 'full' },
  {
    path: 'items',
    canActivate: [appReadyGuard, authGuard],
    loadChildren: () => import('./items/items.routes').then((r) => r.ITEMS_ROUTES),
  },

  { path: 'logics-list', redirectTo: 'logics/list', pathMatch: 'full' },
  { path: 'logics-groups', redirectTo: 'logics/groups', pathMatch: 'full' },
  {
    path: 'logics',
    canActivate: [appReadyGuard, authGuard],
    loadChildren: () => import('./logics/logics.routes').then((r) => r.LOGICS_ROUTES),
  },

  { path: 'threads', redirectTo: 'schedulers/threads', pathMatch: 'full' },
  {
    path: 'schedulers',
    canActivate: [appReadyGuard, authGuard],
    loadChildren: () => import('./schedulers/schedulers.routes').then((r) => r.SCHEDULERS_ROUTES),
  },

  { path: 'plugins_list', redirectTo: 'plugins', pathMatch: 'full' },
  {
    path: 'plugins',
    canActivate: [appReadyGuard, authGuard],
    loadChildren: () => import('./plugins/plugins.routes').then((r) => r.PLUGINS_ROUTES),
  },

  {
    path: 'scenes',
    canActivate: [appReadyGuard, authGuard],
    loadChildren: () => import('./scenes/scenes.routes').then((r) => r.SCENES_ROUTES),
  },
  {
    path: 'logs',
    canActivate: [appReadyGuard, authGuard],
    loadChildren: () => import('./logs/logs.routes').then((r) => r.LOGS_ROUTES),
  },

  { path: 'login', component: LoginComponent },
  { path: '**', component: NotFoundComponent },
];

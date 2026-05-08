import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuardService } from './common/services/auth-guard.service';
import { LoginComponent } from './login/login.component';
import { NotFoundComponent } from './not-found/not-found.component';

const appRoutes: Routes = [
  { path: '', redirectTo: 'system', pathMatch: 'full' },

  { path: 'system', loadChildren: () => import('./system/system.module').then(m => m.SystemModule) },

  { path: 'services', loadChildren: () => import('./services/services.module').then(m => m.ServicesModule) },

  { path: 'item_tree', redirectTo: 'items', pathMatch: 'full' },
  { path: 'items', loadChildren: () => import('./items/items.module').then(m => m.ItemsModule) },

  { path: 'logics-list', redirectTo: 'logics/list', pathMatch: 'full' },
  { path: 'logics-groups', redirectTo: 'logics/groups', pathMatch: 'full' },
  { path: 'logics', loadChildren: () => import('./logics/logics.module').then(m => m.LogicsModule) },

  { path: 'threads', redirectTo: 'schedulers/threads', pathMatch: 'full' },
  { path: 'schedulers', loadChildren: () => import('./schedulers/schedulers.module').then(m => m.SchedulersModule) },

  { path: 'plugins_list', redirectTo: 'plugins', pathMatch: 'full' },
  { path: 'plugins', loadChildren: () => import('./plugins/plugins.module').then(m => m.PluginsModule) },

  { path: 'scenes', loadChildren: () => import('./scenes/scenes.module').then(m => m.ScenesModule) },

  { path: 'logs', loadChildren: () => import('./logs/logs.module').then(m => m.LogsModule) },

  { path: 'login', component: LoginComponent },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { PluginsComponent } from './plugin-list/plugins.component';
import { PluginConfigComponent } from './config/plugin-config.component';

const routes: Routes = [
  { path: '', component: PluginsComponent, canActivate: [AuthGuardService] },
  { path: 'config', component: PluginConfigComponent, canActivate: [AuthGuardService] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PluginsRoutingModule {}

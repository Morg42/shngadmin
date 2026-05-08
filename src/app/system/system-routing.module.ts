import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { SystemComponent } from './system-overview/system.component';
import { SystemConfigComponent } from './system-config/system-config.component';

const routes: Routes = [
  { path: '', component: SystemComponent, canActivate: [AuthGuardService] },
  { path: 'systemproperties', component: SystemComponent, canActivate: [AuthGuardService] },
  { path: 'config', component: SystemConfigComponent, canActivate: [AuthGuardService] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SystemRoutingModule {}

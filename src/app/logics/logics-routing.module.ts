import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { LogicsListComponent } from './logics-list/logics-list.component';
import { LogicsGroupsComponent } from './logics-groups/logics-groups.component';
import { LogicsEditComponent } from './logics-edit/logics-edit.component';

const routes: Routes = [
  { path: '', component: LogicsListComponent, canActivate: [AuthGuardService] },
  { path: 'list', component: LogicsListComponent, canActivate: [AuthGuardService] },
  { path: 'groups', component: LogicsGroupsComponent, canActivate: [AuthGuardService] },
  { path: 'edit/:logicname', component: LogicsEditComponent, canActivate: [AuthGuardService] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LogicsRoutingModule {}

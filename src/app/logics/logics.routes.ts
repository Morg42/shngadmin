import { Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { LogicsEditComponent } from './logics-edit/logics-edit.component';
import { LogicsGroupsComponent } from './logics-groups/logics-groups.component';
import { LogicsListComponent } from './logics-list/logics-list.component';

export const LOGICS_ROUTES: Routes = [
  { path: '', component: LogicsListComponent, canActivate: [AuthGuardService] },
  { path: 'list', component: LogicsListComponent, canActivate: [AuthGuardService] },
  { path: 'groups', component: LogicsGroupsComponent, canActivate: [AuthGuardService] },
  { path: 'edit/:logicname', component: LogicsEditComponent, canActivate: [AuthGuardService] },
];

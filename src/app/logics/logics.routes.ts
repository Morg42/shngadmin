import { Routes } from '@angular/router';
import { appReadyGuard } from '../common/guards/app-ready.guard';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { LogicsEditComponent } from './logics-edit/logics-edit.component';
import { LogicsGroupsComponent } from './logics-groups/logics-groups.component';
import { LogicsListComponent } from './logics-list/logics-list.component';

export const LOGICS_ROUTES: Routes = [
  { path: '', component: LogicsListComponent, canActivate: [appReadyGuard, AuthGuardService] },
  { path: 'list', component: LogicsListComponent, canActivate: [appReadyGuard, AuthGuardService] },
  {
    path: 'groups',
    component: LogicsGroupsComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
  {
    path: 'edit/:logicname',
    component: LogicsEditComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
];

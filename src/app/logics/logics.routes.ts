import { Routes } from '@angular/router';
import { LogicsEditComponent } from './logics-edit/logics-edit.component';
import { LogicsGroupsComponent } from './logics-groups/logics-groups.component';
import { LogicsListComponent } from './logics-list/logics-list.component';

export const LOGICS_ROUTES: Routes = [
  { path: '', component: LogicsListComponent },
  { path: 'list', component: LogicsListComponent },
  {
    path: 'groups',
    component: LogicsGroupsComponent,
  },
  {
    path: 'edit/:logicname',
    component: LogicsEditComponent,
  },
];

import { Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { SchedulersComponent } from './schedulers/schedulers.component';
import { ThreadsComponent } from './threads/threads.component';

export const SCHEDULERS_ROUTES: Routes = [
  { path: '', component: SchedulersComponent, canActivate: [AuthGuardService] },
  { path: 'threads', component: ThreadsComponent, canActivate: [AuthGuardService] },
];

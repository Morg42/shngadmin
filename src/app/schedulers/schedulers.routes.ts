import { Routes } from '@angular/router';
import { SchedulersComponent } from './schedulers/schedulers.component';
import { ThreadsComponent } from './threads/threads.component';

export const SCHEDULERS_ROUTES: Routes = [
  { path: '', component: SchedulersComponent },
  { path: 'threads', component: ThreadsComponent },
];

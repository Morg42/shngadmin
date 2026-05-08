import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { SchedulersComponent } from './schedulers/schedulers.component';
import { ThreadsComponent } from './threads/threads.component';

const routes: Routes = [
  { path: '', component: SchedulersComponent, canActivate: [AuthGuardService] },
  { path: 'threads', component: ThreadsComponent, canActivate: [AuthGuardService] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SchedulersRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { ServicesComponent } from './services.component';
import { FunctionConfigurationComponent } from './function-configuration/function-configuration.component';

const routes: Routes = [
  { path: '', component: ServicesComponent, canActivate: [AuthGuardService] },
  { path: 'functions', component: FunctionConfigurationComponent, canActivate: [AuthGuardService] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ServicesRoutingModule {}

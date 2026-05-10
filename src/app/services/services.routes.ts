import { Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { FunctionConfigurationComponent } from './function-configuration/function-configuration.component';
import { ServicesComponent } from './services.component';

export const SERVICES_ROUTES: Routes = [
  { path: '', component: ServicesComponent, canActivate: [AuthGuardService] },
  { path: 'functions', component: FunctionConfigurationComponent, canActivate: [AuthGuardService] },
];

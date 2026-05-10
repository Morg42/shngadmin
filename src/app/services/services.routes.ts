import { Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { ServicesComponent } from './services.component';
import { FunctionConfigurationComponent } from './function-configuration/function-configuration.component';

export const SERVICES_ROUTES: Routes = [
  { path: '', component: ServicesComponent, canActivate: [AuthGuardService] },
  { path: 'functions', component: FunctionConfigurationComponent, canActivate: [AuthGuardService] },
];

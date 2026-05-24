import { Routes } from '@angular/router';
import { appReadyGuard } from '../common/guards/app-ready.guard';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { FunctionConfigurationComponent } from './function-configuration/function-configuration.component';
import { ServicesComponent } from './services.component';

export const SERVICES_ROUTES: Routes = [
  { path: '', component: ServicesComponent, canActivate: [appReadyGuard, AuthGuardService] },
  {
    path: 'functions',
    component: FunctionConfigurationComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
];

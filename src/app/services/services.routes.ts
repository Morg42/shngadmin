import { Routes } from '@angular/router';
import { FunctionConfigurationComponent } from './function-configuration/function-configuration.component';
import { ServicesComponent } from './services.component';

export const SERVICES_ROUTES: Routes = [
  { path: '', component: ServicesComponent },
  {
    path: 'functions',
    component: FunctionConfigurationComponent,
  },
];

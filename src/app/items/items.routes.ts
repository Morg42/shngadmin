import { Routes } from '@angular/router';
import { appReadyGuard } from '../common/guards/app-ready.guard';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { ItemConfigurationComponent } from './item-configuration/item-configuration.component';
import { ItemConfiguration2Component } from './item-configuration2/item-configuration2.component';
import { ItemTreeComponent } from './item-tree/item-tree.component';
import { StructConfigurationComponent } from './struct-configuration/struct-configuration.component';
import { StructsComponent } from './structs/structs.component';

export const ITEMS_ROUTES: Routes = [
  { path: '', component: ItemTreeComponent, canActivate: [appReadyGuard, AuthGuardService] },
  {
    path: 'config',
    component: ItemConfigurationComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
  {
    path: 'config2',
    component: ItemConfiguration2Component,
    canActivate: [appReadyGuard, AuthGuardService],
  },
  { path: 'structs', component: StructsComponent, canActivate: [appReadyGuard, AuthGuardService] },
  {
    path: 'struct_config',
    component: StructConfigurationComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
];

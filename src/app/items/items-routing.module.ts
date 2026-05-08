import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { ItemTreeComponent } from './item-tree/item-tree.component';
import { ItemConfigurationComponent } from './item-configuration/item-configuration.component';
import { ItemConfiguration2Component } from './item-configuration2/item-configuration2.component';
import { StructsComponent } from './structs/structs.component';
import { StructConfigurationComponent } from './struct-configuration/struct-configuration.component';

const routes: Routes = [
  { path: '', component: ItemTreeComponent, canActivate: [AuthGuardService] },
  { path: 'config', component: ItemConfigurationComponent, canActivate: [AuthGuardService] },
  { path: 'config2', component: ItemConfiguration2Component, canActivate: [AuthGuardService] },
  { path: 'structs', component: StructsComponent, canActivate: [AuthGuardService] },
  { path: 'struct_config', component: StructConfigurationComponent, canActivate: [AuthGuardService] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ItemsRoutingModule {}

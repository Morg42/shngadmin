import { Routes } from '@angular/router';
import { ItemConfigurationComponent } from './item-configuration/item-configuration.component';
import { ItemTreeComponent } from './item-tree/item-tree.component';
import { StructConfigurationComponent } from './struct-configuration/struct-configuration.component';
import { StructsComponent } from './structs/structs.component';

export const ITEMS_ROUTES: Routes = [
  { path: '', component: ItemTreeComponent },
  {
    path: 'config',
    component: ItemConfigurationComponent,
  },
  { path: 'structs', component: StructsComponent },
  {
    path: 'struct_config',
    component: StructConfigurationComponent,
  },
];

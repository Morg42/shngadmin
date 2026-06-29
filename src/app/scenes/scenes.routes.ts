import { Routes } from '@angular/router';
import { SceneConfigurationComponent } from './scene-configuration/scene-configuration.component';
import { ScenesComponent } from './scene-list/scenes.component';

export const SCENES_ROUTES: Routes = [
  { path: '', component: ScenesComponent },
  { path: 'list', component: ScenesComponent },
  {
    path: 'config',
    component: SceneConfigurationComponent,
  },
];

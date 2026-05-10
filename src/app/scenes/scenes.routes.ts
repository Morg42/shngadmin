import { Routes } from '@angular/router';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { ScenesComponent } from './scene-list/scenes.component';
import { SceneConfigurationComponent } from './scene-configuration/scene-configuration.component';

export const SCENES_ROUTES: Routes = [
  { path: '', component: ScenesComponent, canActivate: [AuthGuardService] },
  { path: 'list', component: ScenesComponent, canActivate: [AuthGuardService] },
  { path: 'config', component: SceneConfigurationComponent, canActivate: [AuthGuardService] },
];

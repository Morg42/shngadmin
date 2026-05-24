import { Routes } from '@angular/router';
import { appReadyGuard } from '../common/guards/app-ready.guard';
import { AuthGuardService } from '../common/services/auth-guard.service';
import { SceneConfigurationComponent } from './scene-configuration/scene-configuration.component';
import { ScenesComponent } from './scene-list/scenes.component';

export const SCENES_ROUTES: Routes = [
  { path: '', component: ScenesComponent, canActivate: [appReadyGuard, AuthGuardService] },
  { path: 'list', component: ScenesComponent, canActivate: [appReadyGuard, AuthGuardService] },
  {
    path: 'config',
    component: SceneConfigurationComponent,
    canActivate: [appReadyGuard, AuthGuardService],
  },
];

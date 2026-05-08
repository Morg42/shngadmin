import { NgModule } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { Dialog } from 'primeng/dialog';
import { ListboxModule } from 'primeng/listbox';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { SharedModule } from '../common/shared.module';
import { ScenesRoutingModule } from './scenes-routing.module';
import { ScenesComponent } from './scene-list/scenes.component';
import { SceneConfigurationComponent } from './scene-configuration/scene-configuration.component';

@NgModule({
  declarations: [
    ScenesComponent,
    SceneConfigurationComponent,
  ],
  imports: [
    SharedModule,
    ScenesRoutingModule,
    CodemirrorModule,
    AccordionModule,
    Dialog,
    ListboxModule,
    InputTextModule,
    ButtonModule,
  ],
})
export class ScenesModule {}

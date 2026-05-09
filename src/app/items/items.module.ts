import { NgModule } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TabsModule } from 'primeng/tabs';
import { TreeModule } from 'primeng/tree';
import { AccordionModule } from 'primeng/accordion';
import { Dialog } from 'primeng/dialog';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ListboxModule } from 'primeng/listbox';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { AppComponent } from '../app.component';
import { WebsocketService } from '../common/services/websocket.service';
import { WebsocketPluginService } from '../common/services/websocket-plugin.service';

import { SharedModule } from '../common/shared.module';
import { ItemsRoutingModule } from './items-routing.module';
import { ItemTreeComponent } from './item-tree/item-tree.component';
import { ItemConfigurationComponent } from './item-configuration/item-configuration.component';
import { ItemConfiguration2Component } from './item-configuration2/item-configuration2.component';
import { StructsComponent } from './structs/structs.component';
import { StructConfigurationComponent } from './struct-configuration/struct-configuration.component';

@NgModule({
  declarations: [
    ItemTreeComponent,
    ItemConfigurationComponent,
    ItemConfiguration2Component,
    StructsComponent,
    StructConfigurationComponent,
  ],
  imports: [
    SharedModule,
    ItemsRoutingModule,
    CodemirrorModule,
    FontAwesomeModule,
    TabsModule,
    TreeModule,
    AccordionModule,
    Dialog,
    ToggleSwitch,
    ListboxModule,
    InputTextModule,
    TooltipModule,
    ButtonModule,
  ],
  providers: [AppComponent, WebsocketService, WebsocketPluginService],
})
export class ItemsModule {}

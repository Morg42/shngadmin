import { NgModule } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ModalModule } from 'ngx-bootstrap/modal';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { AccordionModule } from 'primeng/accordion';
import { Dialog } from 'primeng/dialog';
import { ListboxModule } from 'primeng/listbox';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { SharedModule } from '../common/shared.module';
import { LogicsRoutingModule } from './logics-routing.module';
import { LogicsListComponent } from './logics-list/logics-list.component';
import { LogicsGroupsComponent } from './logics-groups/logics-groups.component';
import { LogicsEditComponent } from './logics-edit/logics-edit.component';

@NgModule({
  declarations: [
    LogicsListComponent,
    LogicsGroupsComponent,
    LogicsEditComponent,
  ],
  imports: [
    SharedModule,
    LogicsRoutingModule,
    FontAwesomeModule,
    TabsModule,
    ModalModule,
    CodemirrorModule,
    AccordionModule,
    Dialog,
    ListboxModule,
    Select,
    TableModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
  ],
})
export class LogicsModule {}

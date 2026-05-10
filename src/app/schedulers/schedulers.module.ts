import { NgModule } from '@angular/core';
import { TabsModule } from 'primeng/tabs';

import { SharedModule } from '../common/shared.module';
import { SchedulersRoutingModule } from './schedulers-routing.module';
import { SchedulersComponent } from './schedulers/schedulers.component';
import { ThreadsComponent } from './threads/threads.component';

@NgModule({
    imports: [
        SharedModule,
        SchedulersRoutingModule,
        TabsModule,
        SchedulersComponent,
        ThreadsComponent,
    ],
})
export class SchedulersModule {}

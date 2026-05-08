
import { Component, OnInit, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AppConfigService} from '../../common/services/app-config.service';
import { HttpClient } from '@angular/common/http';

import { SchedulerInfo } from '../../common/models/scheduler-info';
import {SceneInfo} from '../../common/models/scene-info';
import {SystemInfo} from '../../common/models/system-info';
import {TranslateService} from '@ngx-translate/core';
import {MessageService} from 'primeng/api';
import {SchedulersApiService} from '../../common/services/schedulers-api.service';
import {ServerApiService} from '../../common/services/server-api.service';
import {Title} from '@angular/platform-browser';


@Component({
  selector: 'app-schedulers',
  templateUrl: './schedulers.component.html',
  styleUrls: ['./schedulers.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class SchedulersComponent implements OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private dataServiceServer = inject(ServerApiService);
  private dataService = inject(SchedulersApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);

  schedulerinfo: SchedulerInfo[];
  developerMode: boolean;

  public setTitle(newTitle: string) {
      this.titleService.setTitle(newTitle);
  }


  ngOnInit() {
    console.log('SchedulersComponent.ngOnInit');

      this.dataServiceServer.getServerinfo()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(
              (response) => {
                  this.setTitle(this.translate.instant('MENU.SCHEDULERS'));

                  this.dataService.getSchedulers()
                      .pipe(takeUntilDestroyed(this.destroyRef))
                      .subscribe(
                          (response2) => {
                              this.schedulerinfo = <SchedulerInfo[]>response2;
//          this.schedulerinfo.sort(function (a, b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)});
                              this.developerMode = (this.appConfig.developerMode);

                              console.log('getSchedulers', {response2});
                              this.cdr.markForCheck();
                          }
                      );
              }
          );

  }
}


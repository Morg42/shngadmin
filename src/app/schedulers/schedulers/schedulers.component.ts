
import { Component, OnInit } from '@angular/core';
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
    standalone: false
})

export class SchedulersComponent implements OnInit {

  schedulerinfo: SchedulerInfo[];
  developerMode: boolean;

  constructor(private http: HttpClient,
              private dataServiceServer: ServerApiService,
              private dataService: SchedulersApiService,
              private translate: TranslateService,
              private titleService: Title) {
  }

  public setTitle(newTitle: string) {
      this.titleService.setTitle(newTitle);
  }


  ngOnInit() {
    console.log('SchedulersComponent.ngOnInit');

      this.dataServiceServer.getServerinfo()
          .subscribe(
              (response) => {
                  this.setTitle(this.translate.instant('MENU.SCHEDULERS'));

                  this.dataService.getSchedulers()
                      .subscribe(
                          (response2) => {
                              this.schedulerinfo = <SchedulerInfo[]>response2;
//          this.schedulerinfo.sort(function (a, b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)});
                              this.developerMode = (sessionStorage.getItem('developer_mode') === 'true');

                              console.log('getSchedulers', {response2});
                          }
                      );
              }
          );

  }
}


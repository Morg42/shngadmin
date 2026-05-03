
import { Component, OnInit } from '@angular/core';

import { ThreadInfo } from '../../common/models/thread-info';
import {ThreadsApiService} from '../../common/services/threads-api.service';
import {ServerApiService} from '../../common/services/server-api.service';
import {SharedService} from '../../common/services/shared.service';
import {TranslateService} from '@ngx-translate/core';
import {Title} from '@angular/platform-browser';


@Component({
    selector: 'app-threads',
    templateUrl: './threads.component.html',
    styleUrls: ['./threads.component.css'],
    standalone: false
})


export class ThreadsComponent implements OnInit {

  threadsList: ThreadInfo[];
  threads_count: number;
  thread_response: [number, ThreadInfo[]];


  constructor(private dataService: ThreadsApiService,
              private dataServiceServer: ServerApiService,
              private translate: TranslateService,
              private titleService: Title) { }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // console.log('ThreadsComponent.ngOnInit');

      this.dataServiceServer.getServerinfo()
          .subscribe(
              (response) => {
                  this.setTitle(this.translate.instant('MENU.THREADS'));

                  this.dataService.getThreads()
                      .subscribe(
                          (response2) => {
                              this.threadsList = response2[1];
                              this.threads_count = response2[0];
//          this.schedulerinfo.sort(function (a, b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)});
                              console.log('getThreads', {response2});
                          }
                      );
              }
          );

  }

}


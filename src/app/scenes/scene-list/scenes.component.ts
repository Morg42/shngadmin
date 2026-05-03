
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';


import { TreeNode } from '../../common/models/interfaces';
import { ScenesApiService } from '../../common/services/scenes-api.service';
import {PlugininfoType} from '../../common/models/plugin-info';
import {SystemInfo} from '../../common/models/system-info';
import {SceneInfo} from '../../common/models/scene-info';
import {ServerApiService} from '../../common/services/server-api.service';
import {Title} from '@angular/platform-browser';




@Component({
    selector: 'app-scenes',
    templateUrl: './scenes.component.html',
    styleUrls: ['./scenes.component.css'],
    providers: [MessageService],
    standalone: false
})
export class ScenesComponent implements OnInit {


  sceneList: SceneInfo[];

  systeminfo: SystemInfo = <SystemInfo>{};


  constructor(private http: HttpClient,
              private dataServiceServer: ServerApiService,
              private translate: TranslateService,
              private messageService: MessageService,
              private dataService: ScenesApiService,
              private titleService: Title) { }

    public setTitle(newTitle: string) {
        this.titleService.setTitle(newTitle);
    }


  ngOnInit() {
    console.log('ScenesComponent.ngOnInit');

      this.dataServiceServer.getServerinfo()
          .subscribe(
              (response) => {
                  this.setTitle(this.translate.instant('MENU.SCENE_LIST'));

                  this.dataService.getScenes()
                      .subscribe(
                          (response2) => {
                              this.sceneList = <SceneInfo[]>response2;
    //          this.schedulerinfo.sort(function (a, b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)});
                              console.log('getScenes', {response2});
                          }
                      );
              }
          );

  }

}

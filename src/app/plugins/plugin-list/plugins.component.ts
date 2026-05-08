
import { Component, OnInit, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AppConfigService} from '../../common/services/app-config.service';
import { TemplateRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import {faPlayCircle, faPauseCircle, faExclamationTriangle, faCode, faLaptopCode} from '@fortawesome/free-solid-svg-icons';

import { PluginsApiService } from '../../common/services/plugins-api.service';
import { OlddataService } from '../../common/services/olddata.service';
import { SchedulerInfo } from '../../common/models/scheduler-info';
import { PlugininfoType } from '../../common/models/plugin-info';
import {ServerApiService} from '../../common/services/server-api.service';
import {LogicsinfoType} from '../../common/models/logics-info';
import {TranslateService} from '@ngx-translate/core';
import {Title} from '@angular/platform-browser';

@Component({
  selector: 'app-plugins',
  templateUrl: './plugins.component.html',
  styleUrls: ['./plugins.component.css'],
  providers: [OlddataService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PluginsComponent implements OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  faPlayCircle = faPlayCircle;
  faPauseCircle = faPauseCircle;
  faExclamationTriangle = faExclamationTriangle;  // signal deprecated plugin
  faCode = faLaptopCode;                               // signal plugin in state "develop"

  plugininfo: PlugininfoType[];
  developerMode: boolean;

  modalRef: BsModalRef;
  constructor(private http: HttpClient,
              private dataServiceServer: ServerApiService,
              private pluginsDataService: PluginsApiService,
              private modalService: BsModalService,
              private translate: TranslateService,
              private titleService: Title,
              private appConfig: AppConfigService) {
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    console.log('PluginsComponent.ngOnInit');

    this.dataServiceServer.getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response) => {
          this.setTitle(this.translate.instant('MENU.PLUGINS_LIST'));

          this.developerMode = (this.appConfig.developerMode);
          this.getPlugins();
        }
      );
/*
    this.dataServiceServer.getServerinfo()
      .subscribe(
        (response) => {
          this.developerMode = (this.appConfig.developerMode);

          this.pluginsDataService.getPluginsInfo()
            .subscribe(
              (response2) => {
                this.plugininfo = <any>response2;
                this.plugininfo.sort(function (a, b) {return (a.pluginname + a.configname.toLowerCase() > b.pluginname + b.configname.
                toLowerCase()) ? 1 : ((b.pluginname + b.configname.toLowerCase() > a.pluginname + a.configname.toLowerCase()) ? -1 : 0); });
              }
            );
        }
      );
*/
  }


  getPlugins() {
    this.pluginsDataService.getPluginsInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response) => {
          this.plugininfo = <any>response;
          this.plugininfo.sort(function (a, b) {return (a.pluginname + a.configname.toLowerCase() > b.pluginname + b.configname.
          toLowerCase()) ? 1 : ((b.pluginname + b.configname.toLowerCase() > a.pluginname + a.configname.toLowerCase()) ? -1 : 0); });
          this.cdr.markForCheck();
        }
      );
  }


  parameterLines(parameters) {
    let result = Math.round(parameters / 2);
    if (result < 3) {
      result = 3;
    }
    return result;
  }

  attributeLines(parameters) {
    let result = Math.round(parameters / 3);
    if (result < 2) {
      result = 2;
    }
    return result;
  }

  openModal(template: TemplateRef<any>, parm: string) {
    this.modalRef = this.modalService.show(template, {animated: false});
    console.log('openModal: ' + parm);
  }

  goToLink(url: string) {
    window.open(url, '_blank');
  }


  stopPlugin(pluginConfigName) {
    // console.log('stopPlugin', {pluginConfigName});

    this.pluginsDataService.setPluginState(pluginConfigName, 'stop')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response) => {
          this.getPlugins();
        }
      );
  }


  startPlugin(pluginConfigName) {
    // console.log('startPlugin', {pluginConfigName});

    this.pluginsDataService.setPluginState(pluginConfigName, 'start')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response) => {
          this.getPlugins();
        }
      );
  }


  reloadPlugin(pluginConfigName) {
    // console.log('reloadPlugin', {pluginConfigName});

    this.pluginsDataService.setPluginState(pluginConfigName, 'reload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response) => {
          this.getPlugins();
        }
      );
  }

}


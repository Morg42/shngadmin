
// import { Component, OnInit } from '@angular/core';
import { Component, ElementRef, ViewChild, OnInit, Renderer2 } from '@angular/core';

import { TemplateRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BsModalService} from 'ngx-bootstrap/modal';

import {LogicsApiService} from '../../common/services/logics-api.service';
import {LogicsGroupType, LogicsinfoType} from '../../common/models/logics-info';
import {OlddataService} from '../../common/services/olddata.service';
// //// import {Log} from '@angular/core/testing/src/logger';
import {ActivatedRoute, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {TranslateService} from '@ngx-translate/core';
import {ServerApiService} from '../../common/services/server-api.service';

@Component({
    selector: 'app-logics',
    templateUrl: './logics-list.component.html',
    styleUrls: ['./logics-list.component.css'],
    providers: [OlddataService],
    standalone: false
})
export class LogicsListComponent implements OnInit {

  groupdefinitions = {};
  groupList: LogicsGroupType[];
  groupExpandedOnStart: number[] = [];
  groupExpanded: number[] = [];
  nogroups: boolean;
  logics: LogicsinfoType[];
  userlogics: LogicsinfoType[];
  systemlogics: LogicsinfoType[];
  newlogics: LogicsinfoType[];

  newlogic_display: boolean = false;
  newlogic_name: string = '';
  newlogic_filename: string = '';
  newlogic_add_enabled: boolean = true;
  wrongNewLogicName: string = '';
  confirmdelete_display: boolean = false;
  logicToDelete: string = '';
  delete_param: {};


  constructor(private http: HttpClient,
              private dataServiceServer: ServerApiService,
              private dataService: LogicsApiService,
              private modalService: BsModalService,
              private router: Router,
              private route: ActivatedRoute,
              private translate: TranslateService,
              private titleService: Title,
              private renderer: Renderer2) {
    this.userlogics = [];
    this.systemlogics = [];
    this.nogroups = true;
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }


  ngOnInit() {
    console.log('LogicsListComponent.ngOnInit');

    console.warn('logics-list:ngOnInit');
    this.groupExpandedOnStart = this.dataService.groupExpanded;
    this.groupExpanded = this.dataService.groupExpanded;

    this.dataServiceServer.getServerinfo()
        .subscribe(
            (response) => {
              this.setTitle(this.translate.instant('MENU.LOGICS'));

              this.getLogics();
            }
        );
  }


  baseName(str, withExtension = true) {
    let base = str;
    base = base.substring(base.lastIndexOf('/') + 1);
    if (!withExtension && base.lastIndexOf('.') !== -1) {
      base = base.substring(0, base.lastIndexOf('.'));
    }
    return base;
  }


  addGroup(name) {

    if (this.groupList.find(g => g.name === name) === undefined) {
      let title = '';
      let description = '';
      if (this.groupdefinitions[name] !== undefined) {
        title = this.groupdefinitions[name]['title'];
        description = this.groupdefinitions[name]['description'];
      }
      const group: LogicsGroupType = {name: name, title: title, description: description};
      this.groupList.push(group);
      if (name !== '') {
        this.nogroups = false;
      }
    }
  }


  groupOpened(event) {
    const index = event['index'];
    console.warn( 'groupOpened', {index});

    console.log('this.groupExpanded', this.groupExpanded);
    console.log('this.groupExpandedOnStart', this.groupExpandedOnStart);

    if (this.groupExpanded.indexOf(index) === -1) {
      this.groupExpanded.push(index);
      this.dataService.groupExpanded = this.groupExpanded;
    }
    console.log('this.groupExpanded', this.groupExpanded);
  }


  groupClosed(event) {
    const index = event['index'];
    console.warn( 'groupClosed', {index});
    if (this.groupExpanded === undefined) {
      this.groupExpanded = [];
    }
    console.log('this.groupExpanded', this.groupExpanded);

    if (this.groupExpanded.indexOf(index) > -1) {
      this.groupExpanded.splice(this.groupExpanded.indexOf(index), 1);
      this.dataService.groupExpanded = this.groupExpanded;
    }
    console.log('this.groupExpanded', this.groupExpanded);
  }


  sortGroupList() {
    this.groupList.sort(function (a, b) {
      return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 :
        ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 :
            0
        );
    });
    if (this.groupList[0].name === '') {
      // move 'no group' to end of list
      // this.groupList[0].name = 'keine Gruppe';
      this.groupList.push(this.groupList[0]);
      this.groupList.shift();
    }
  }


  getLogics() {
    this.dataService.getLogics()
      .subscribe(
        (response) => {
          this.groupdefinitions = response['groups'];
          this.logics = <LogicsinfoType[]>response['logics'];
          this.logics.sort(function (a, b) {return (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0); });
          this.userlogics = [];
          this.systemlogics = [];
          this.groupList = [];
          for (const logic of this.logics) {
            if (logic.userlogic === true) {
              if (logic.group === undefined || logic.group.length === 0) {
                logic.group = [''];
              }
              this.userlogics.push(logic);
              for (const g in logic.group) {
                if (logic.group.hasOwnProperty(g)) {
                  this.addGroup(logic.group[g]);
                }
              }
            } else {
              this.systemlogics.push(logic);
            }
          }
          this.sortGroupList();

          this.userlogics.sort(function (a, b) {
            return (a.name.toLowerCase() > b.name.toLowerCase()) ?
              1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ?
                -1 : 0);
          });
          this.newlogics = <LogicsinfoType[]>response['logics_new'];
          this.newlogics.sort(function (a, b) {
            return (a.name.toLowerCase() > b.name.toLowerCase()) ?
              1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ?
                -1 : 0);
          });
        }
      );
  }


  triggerLogic(logicName) {
    // console.log('triggerLogic', {logicName});
    this.dataService.setLogicState(logicName, 'trigger')
      .subscribe(
        (response) => {
          this.getLogics();
        }
      );
  }


  disableLogic(logicName) {
    // console.log('disableLogic', {logicName});
    this.dataService.setLogicState(logicName, 'disable')
      .subscribe(
        (response) => {
          this.getLogics();
        }
      );
  }


  enableLogic(logicName) {
    // console.log('enableLogic', {logicName});
    this.dataService.setLogicState(logicName, 'enable')
      .subscribe(
        (response) => {
          this.getLogics();
        }
      );
  }


  unloadLogic(logicName) {
    // console.log('unloadLogic', {logicName});
    this.dataService.setLogicState(logicName, 'unload')
      .subscribe(
        (response) => {
          this.getLogics();
        }
      );
  }


  reloadLogic(logicName) {
    // console.log('reloadLogic', {logicName});
    this.dataService.setLogicState(logicName, 'reload')
      .subscribe(
        (response) => {
          this.getLogics();
        }
      );
  }


  loadLogic(logicName) {
    // console.log('loadLogic', {logicName});
    this.dataService.setLogicState(logicName, 'load')
      .subscribe(
        (response) => {
          this.getLogics();
        }
      );
  }


  newLogic() {
    console.log('newLogic');
    this.newlogic_name = '';
    this.newlogic_filename = '';
    this.newlogic_add_enabled = false;

    this.newlogic_display = true;
  }


  onShow() {
    console.warn('onShow');
  }

  onBlur() {
    console.warn('onBlur');
  }

  onFocus() {
    console.warn('onFocus');
    if (this.newlogic_filename === '') {
      this.newlogic_filename = this.newlogic_name;
      if (this.newlogic_name !== '') {
        this.newlogic_add_enabled = true;
      }
    }
  }


  checkNewLogicInput() {
    this.newlogic_add_enabled = true;

    if (this.newlogic_name.match(/^\d/)) {
      this.newlogic_add_enabled = false;
      this.wrongNewLogicName = 'LOGICS.INVALID_NAME';
      return;
    }

    for (let i = 0; i < this.logics.length; i++) {
      // console.log({i}, this.logics[i].name);
      if (this.newlogic_name === this.logics[i].name) {
        this.newlogic_add_enabled = false;
        this.wrongNewLogicName = 'LOGICS.NAME_ALREADY_EXISTS';
        return;
      }
    }

    for (let i = 0; i < this.logics.length; i++) {
      // console.log({i}, this.baseName(this.logics[i].pathname, false));
      if (this.newlogic_filename === this.baseName(this.logics[i].pathname, false)) {
        this.newlogic_add_enabled = false;
        this.wrongNewLogicName = 'LOGICS.FILENAME_ALREADY_EXISTS';
        return;
      }
    }

    if (this.newlogic_name === '' || this.newlogic_filename === '') {
      this.newlogic_add_enabled = false;
      this.wrongNewLogicName = '';
      return;
    }

    this.wrongNewLogicName = '';
  }


  createLogic() {
    console.warn('createLogic', this.newlogic_name, this.newlogic_filename);
    this.newlogic_display = false;
    this.dataService.setLogicState(this.newlogic_name, 'create', this.newlogic_filename)
      .subscribe(
        (response) => {
          this.getLogics();
          this.router.navigate(['/logics/edit', this.newlogic_name]);
        }
      );
  }



  deleteLogic(logicName, fileName) {
    // console.log('deleteLogic', {logicName});

    this.logicToDelete = logicName;
    this.delete_param = {'config': logicName, 'filename': fileName};
    this.confirmdelete_display = true;
  }


  deleteLogicConfirm(with_code) {
    // console.log('deleteLogicConfirm', this.logicToDelete);
    this.confirmdelete_display = false;

    let action = 'delete';
    if (with_code === true) {
      action = 'delete_with_code';
    }

    this.dataService.setLogicState(this.logicToDelete, action)
      .subscribe(
        (response) => {
          this.getLogics();
        }
      );
  }


  deleteLogicAbort() {
    this.confirmdelete_display = false;
    this.logicToDelete = '';
  }
}


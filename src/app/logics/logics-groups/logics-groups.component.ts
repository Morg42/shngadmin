import {Component, OnInit, ViewChild} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ServerApiService} from '../../common/services/server-api.service';
import {FilesApiService} from '../../common/services/files-api.service';
import {ServicesApiService} from '../../common/services/services-api.service';
import {Title} from '@angular/platform-browser';
import {SelectItem} from 'primeng/api';
import {LogicsApiService} from '../../common/services/logics-api.service';
import {LogicsGroupType} from '../../common/models/logics-info';

@Component({
    selector: 'app-logics-groups',
    templateUrl: './logics-groups.component.html',
    styleUrls: ['./logics-groups.component.css'],
    standalone: false
})
export class LogicsGroupsComponent implements OnInit {

  constructor(private translate: TranslateService,
              private dataServiceServer: ServerApiService,
              private dataService: LogicsApiService,
              private titleService: Title) { }

  // -----------------------------------------------------------------
  //  Vars for the codemirror components
  //
  rulers = [];

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  @ViewChild('codeeditor') private codeEditor;

  logicGroups: LogicsGroupType[];         // filelist: string[];
  groupList: string[];
  group: LogicsGroupType;
  menuGroupList: SelectItem[];  // itemFiles: SelectItem[];
  selectedGroup: SelectItem;

  myEditGroup = '';    // myEditFilename = '';

  error_display = false;
  myTextOutput = '';

  newgroup_display = false;
  newGroupname = '';
  add_enabled = false;
  myTextarea = '';

  groupTitleOrig = '';
  groupDescriptionOrig = '';
  groupChanged: boolean;

  confirmdelete_display: boolean = false;
  delete_param: {};



  ngOnInit() {

    this.group = {'title': '', 'description': ''};
    const groupDesc = document.getElementById('group-desc');
          if (groupDesc) {
            groupDesc.textContent = this.group.description;
          }

    this.dataService.getGroupsInfo()
      .subscribe(
        (response) => {
          this.logicGroups = <any>response['groups'];
          this.groupList = Object.keys(this.logicGroups).sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
          });

          this.menuGroupList = [];
          for (let i = 0; i < this.groupList.length; i++) {
            this.menuGroupList = [...this.menuGroupList, <SelectItem> {'label': this.groupList[i], 'value': this.groupList[i]}];
          }

          this.myEditGroup = '';
        }

      );



  }



  hasGroupChanged() {
    const desc = document.getElementById('group-desc')?.textContent || '';
    const descHtml = document.getElementById('group-desc')?.innerHTML || '';
    console.log('hasGroupChanged: descHtml', descHtml);

    if (this.groupTitleOrig !== this.group['title'] ) {
      return true;
    }
    if (this.groupDescriptionOrig !== desc.trim() ) {
      return true;
    }
    return false;
  }



  deleteGroup() {

    this.delete_param = {'config': this.myEditGroup};
    this.confirmdelete_display = true;
  }


  DeleteGroupConfirm() {

    console.log('LogicsGroupsComponent.DeleteGroupConfirm');
    console.log('this.myEditGroup', this.myEditGroup);

    // close confirm dialog
    this.confirmdelete_display = false;

    // delete on backend server

    this.dataService.deleteLogicGroup(this.myEditGroup)

      .subscribe(
        (response: any) => {
          if (response) {
            // close configuration dialog
            this.confirmdelete_display = false;
            console.log('LogicsGroupsComponent.DeleteConfigConfirm(): Returned from api', response);

            delete this.logicGroups[this.myEditGroup];

            this.groupList = Object.keys(this.logicGroups).sort(function (a, b) {
              return a.toLowerCase().localeCompare(b.toLowerCase());
            });

            this.menuGroupList = [];
            for (let i = 0; i < this.groupList.length; i++) {
              this.menuGroupList = [...this.menuGroupList, <SelectItem> {'label': this.groupList[i], 'value': this.groupList[i]}];
            }

            this.myEditGroup = '';
            this.group = {'title': '', 'description': ''};
            const groupDesc = document.getElementById('group-desc');
            if (groupDesc) {
              groupDesc.textContent = this.group.description;
            }

          }
        }
      );

    // alert('code for removal of plugin "' + this.dialog_configname + '" configurations is not yet implemented');


    return true;
  }



  checkInput() {

    this.add_enabled = false;
    if (this.newGroupname.length > 0) {
      this.add_enabled = true;
      for (const groupno in this.groupList) {
        const gn = this.groupList[groupno];
        if (this.newGroupname.toLowerCase() === gn.toLowerCase()) {
          this.add_enabled = false;
        }
      }
    }
  }


  newGroup() {
    this.newGroupname = '';
    this.add_enabled = false;
    this.newgroup_display = true;
  }


  newGroupAbort() {
    this.newGroupname = '';
    this.add_enabled = false;
    this.newgroup_display = false;

    const groupDesc = document.getElementById('group-desc');
      if (groupDesc) {
        groupDesc.textContent = this.group.description;
      }

    this.selectedGroup = {'label': this.myEditGroup, 'value': this.myEditGroup};
  }


  addGroup() {
    console.log('LogicsGroupsComponent.addGroup');
    console.log('this.newGroupname', this.newGroupname);

    this.newgroup_display = false;


    this.myEditGroup = this.newGroupname;
    const newGroup = {'title': '', 'description': ''};

    this.dataService.saveLogicGroup(this.myEditGroup, newGroup)
      .subscribe(
        (response) => {
          this.groupTitleOrig = this.group['title'];
          this.groupDescriptionOrig = this.group['description'];

          if (this.myEditGroup !== '') {
            this.logicGroups[this.myEditGroup] = newGroup;
            this.group = this.logicGroups[this.myEditGroup];
            const groupDesc = document.getElementById('group-desc');
              if (groupDesc) {
                groupDesc.innerHTML = this.group.description + '<br><br><br>';
              }
          }
          this.groupChanged = false;

          this.groupList = Object.keys(this.logicGroups).sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
          });

          this.menuGroupList = [];
          for (let i = 0; i < this.groupList.length; i++) {
            this.menuGroupList = [...this.menuGroupList, <SelectItem> {'label': this.groupList[i], 'value': this.groupList[i]}];
          }
          this.selectedGroup = {'label': this.myEditGroup, 'value': this.myEditGroup};
          console.warn('LogicsGroupsComponent.addGroup: selectedGroup:', this.selectedGroup);
        }
      );

  }


  groupSelected() {
    const group = this.selectedGroup.value;
    if (group === '') {
      this.myEditGroup = '';
      this.group = {'title': '', 'description': ''};
      const groupDesc = document.getElementById('group-desc');
          if (groupDesc) {
            groupDesc.textContent = this.group.description;
          }
      console.log('groupSelected() *2' , {group});
      // this.myTextarea = '';
      // this.cmOptions.readOnly = true;
    } else {
      this.myEditGroup = group;
      this.group = this.logicGroups[group];
      if (this.group.description === undefined) {
        this.group.description = '';
      }
      const groupDesc = document.getElementById('group-desc');
      if (groupDesc) {
        groupDesc.innerHTML = this.group.description + '<br><br><br>';
      }
      this.groupTitleOrig = this.logicGroups[group]['title'];
      this.groupDescriptionOrig = this.logicGroups[group]['description'];
      console.log('groupSelected()' , {group}, this.group);
      // this.getItemFile(group);
    }
  }


  discardChanges() {
    const desc = document.getElementById('group-desc')?.textContent || '';
    console.log('discardChanges', {desc});

    this.group.title = this.groupTitleOrig;
    this.group.description = this.groupDescriptionOrig;
    const groupDesc = document.getElementById('group-desc');
    if (groupDesc) {
      groupDesc.textContent = this.group.description;
    }
    this.groupChanged = false;
    console.log('this.group.description', this.group.description);

  }

  saveGroup() {
    console.log('LoggingConfigurationComponent.saveGroup');

    const desc = document.getElementById('group-desc')?.textContent || '';
    console.log('saveGroup', {desc});
    this.group['description'] = desc.trim();

    this.dataService.saveLogicGroup(this.myEditGroup, this.group)
      .subscribe(
        (response) => {
          this.groupTitleOrig = this.group['title'];
          this.groupDescriptionOrig = this.group['description'];

          this.logicGroups[this.myEditGroup] = this.group;
          const groupDesc = document.getElementById('group-desc');
          if (groupDesc) {
            groupDesc.textContent = this.group.description;
          }
          this.groupChanged = false;
        }
      );


  }

}

import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate, SelectItem } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Listbox } from 'primeng/listbox';
import { LogicsGroupType } from '../../common/models/logics-info';
import { LogicsApiService } from '../../common/services/logics-api.service';
import { ServerApiService } from '../../common/services/server-api.service';

@Component({
  selector: 'app-logics-groups',
  templateUrl: './logics-groups.component.html',
  styleUrls: ['./logics-groups.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    ButtonDirective,
    Listbox,
    FormsModule,
    InputText,
    NgStyle,
    Dialog,
    PrimeTemplate,
    TranslatePipe,
  ],
})
export class LogicsGroupsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private dataServiceServer = inject(ServerApiService);
  private dataService = inject(LogicsApiService);
  private titleService = inject(Title);

  // -----------------------------------------------------------------
  //  Vars for the codemirror components
  //
  rulers = [];

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  @ViewChild('codeeditor') private codeEditor;

  logicGroups: LogicsGroupType[]; // filelist: string[];
  groupList: string[];
  group: LogicsGroupType;
  menuGroupList: SelectItem[]; // itemFiles: SelectItem[];
  selectedGroup: SelectItem;

  myEditGroup = ''; // myEditFilename = '';

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
    this.group = { title: '', description: '' };
    const groupDesc = document.getElementById('group-desc');
    if (groupDesc) {
      groupDesc.textContent = this.group.description;
    }

    this.dataService
      .getGroupsInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.logicGroups = (response as { groups: LogicsGroupType[] })['groups'];
        this.groupList = Object.keys(this.logicGroups).sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        this.menuGroupList = [];
        for (let i = 0; i < this.groupList.length; i++) {
          this.menuGroupList = [
            ...this.menuGroupList,
            <SelectItem>{ label: this.groupList[i], value: this.groupList[i] },
          ];
        }

        this.myEditGroup = '';
        this.cdr.markForCheck();
      });
  }

  hasGroupChanged() {
    const desc = document.getElementById('group-desc')?.textContent || '';
    const descHtml = document.getElementById('group-desc')?.innerHTML || '';
    console.log('hasGroupChanged: descHtml', descHtml);

    if (this.groupTitleOrig !== this.group['title']) {
      return true;
    }
    if (this.groupDescriptionOrig !== desc.trim()) {
      return true;
    }
    return false;
  }

  deleteGroup() {
    this.delete_param = { config: this.myEditGroup };
    this.confirmdelete_display = true;
  }

  DeleteGroupConfirm() {
    console.log('LogicsGroupsComponent.DeleteGroupConfirm');
    console.log('this.myEditGroup', this.myEditGroup);

    // close confirm dialog
    this.confirmdelete_display = false;

    // delete on backend server

    this.dataService
      .deleteLogicGroup(this.myEditGroup)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
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
            this.menuGroupList = [
              ...this.menuGroupList,
              <SelectItem>{ label: this.groupList[i], value: this.groupList[i] },
            ];
          }

          this.myEditGroup = '';
          this.group = { title: '', description: '' };
          const groupDesc = document.getElementById('group-desc');
          if (groupDesc) {
            groupDesc.textContent = this.group.description;
          }
          this.cdr.markForCheck();
        }
      });

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

    this.selectedGroup = { label: this.myEditGroup, value: this.myEditGroup };
  }

  addGroup() {
    console.log('LogicsGroupsComponent.addGroup');
    console.log('this.newGroupname', this.newGroupname);

    this.newgroup_display = false;

    this.myEditGroup = this.newGroupname;
    const newGroup = { title: '', description: '' };

    this.dataService
      .saveLogicGroup(this.myEditGroup, newGroup)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
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
          this.menuGroupList = [
            ...this.menuGroupList,
            <SelectItem>{ label: this.groupList[i], value: this.groupList[i] },
          ];
        }
        this.selectedGroup = { label: this.myEditGroup, value: this.myEditGroup };
        console.warn('LogicsGroupsComponent.addGroup: selectedGroup:', this.selectedGroup);
        this.cdr.markForCheck();
      });
  }

  groupSelected() {
    const group = this.selectedGroup.value;
    if (group === '') {
      this.myEditGroup = '';
      this.group = { title: '', description: '' };
      const groupDesc = document.getElementById('group-desc');
      if (groupDesc) {
        groupDesc.textContent = this.group.description;
      }
      console.log('groupSelected() *2', { group });
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
      console.log('groupSelected()', { group }, this.group);
      // this.getItemFile(group);
    }
  }

  discardChanges() {
    const desc = document.getElementById('group-desc')?.textContent || '';
    console.log('discardChanges', { desc });

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
    console.log('saveGroup', { desc });
    this.group['description'] = desc.trim();

    this.dataService
      .saveLogicGroup(this.myEditGroup, this.group)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.groupTitleOrig = this.group['title'];
        this.groupDescriptionOrig = this.group['description'];

        this.logicGroups[this.myEditGroup] = this.group;
        const groupDesc = document.getElementById('group-desc');
        if (groupDesc) {
          groupDesc.textContent = this.group.description;
        }
        this.groupChanged = false;
        this.cdr.markForCheck();
      });
  }
}

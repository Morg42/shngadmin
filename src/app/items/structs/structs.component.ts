
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { ServerInfo } from '../../common/models/server-info';
import { TranslateService } from '@ngx-translate/core';
import { TreeNode } from 'primeng/api';


import { StructsApiService } from '../../common/services/structs-api.service';
import { ItemTree } from '../../common/models/item-tree';
import {PlugininfoType} from '../../common/models/plugin-info';
import { SystemInfo } from '../../common/models/system-info';
import { SceneInfo } from '../../common/models/scene-info';
import { SharedService } from '../../common/services/shared.service';
import {ServerApiService} from '../../common/services/server-api.service';
import {Title} from '@angular/platform-browser';




@Component({
    selector: 'app-structs',
    templateUrl: './structs.component.html',
    styleUrls: ['./structs.component.css'],
    standalone: false
})
export class StructsComponent implements OnInit {

// ----

  structsDict: {};
  structsList: string[];
  structsGroups: string[];
  selectedItem: TreeNode;
  displayTree: TreeNode[];
  displayTrees: {};
  groupExpanded: {};
  structExpanded: {};
  structExpanded2: {};
  globalStructsID: string;


  // systeminfo: SystemInfo = <SystemInfo>{};


  constructor(private http: HttpClient,
              private dataServiceServer: ServerApiService,
              private translate: TranslateService,
              private dataService: StructsApiService,
              public shared: SharedService,
              private titleService: Title) { }

  serverInfo = <ServerInfo>{};


  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    console.log('StructsComponent.ngOnInit');

    this.setTitle(this.translate.instant('ITEMS.STRUCT_CONFIGFILE'));

    this.displayTrees = {};
    this.groupExpanded = {};
    this.structExpanded = {};
    this.structExpanded2 = {};
    this.globalStructsID = 'Individual';

    this.dataServiceServer.getServerinfo()
        .subscribe(
            (response) => {
              this.serverInfo = <ServerInfo> response;
              this.shared.setGuiLanguage();

              this.getStructsData();
            }
        );
  }

  getStructsData() {
    this.dataService.getStructs()
      .subscribe(
        (response) => {
          this.structsDict = <any>response;
          this.structsList = [];
          // this.structsDict.sort(function (a, b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)});
          for (const k in this.structsDict) {
            if (k in this.structsDict) {
              this.structsList.push(k);
              this.displayTree = this.buildDisplayTree(this.structsDict[k]);
              this.displayTrees[k] = this.displayTree;
            }
          }

          /* sort structList */
          this.structsList.sort((n1, n2) => {
            if (n1 > n2) {
              return 1;
            }
            if (n1 < n2) {
              return -1;
            }
            return 0;
          });

          this.structsGroups = [];
          // eslint-disable-next-line guard-for-in
          for (const s in this.structsList) {
            let prefix = this.structsList[s].split('.')[0];
            if (this.structsList[s].split('.').length === 1) {
              prefix = this.globalStructsID;
              prefix = 'my';
            }
            if (this.structsGroups.indexOf(prefix) < 0) {
              if (prefix === this.globalStructsID || prefix === 'my') {
                this.structsGroups.unshift(prefix);
              } else {
                this.structsGroups.push(prefix);
              }
            }
          }

        }
      );
  }

  // -------------------------------------------------------------------------------------------
  // build a display tree for the PrimeNG component from the itemtree received from the backend
  //
  buildDisplayTree(subtree) {
    const displayTreeList = [];
    for (const key in subtree) {
      if (key in subtree) {
        const displayNode = {};
        if (Array.isArray(subtree)) {
          displayNode['label'] = '- ' + subtree[key];
        } else {
          if (typeof subtree[key] === 'string' || typeof subtree[key] === 'number' || typeof subtree[key] === 'boolean') {
            displayNode['label'] = key + ': ' + subtree[key];
          } else {
            displayNode['label'] = key;
          }
        }
        if (typeof subtree[key] === 'object') {
          displayNode['children'] = this.buildDisplayTree(subtree[key]);
        }
        displayTreeList.push(displayNode);
      }
    }
    return displayTreeList;
  }


  expandAll(tree) {
    tree.forEach( node => {
      this.expandRecursive(node, true);
    } );
  }

  collapseAll(tree) {
    tree.forEach( node => {
      this.expandRecursive(node, false);
    } );
  }

  getStructListByGroup(group) {
    const structSublist = [];
    // eslint-disable-next-line guard-for-in
    for (const entry in this.structsList) {
      if ((group === 'my') && (this.structsList[entry].split('.').length === 1)) {
        structSublist.push(this.structsList[entry]);
      }
      if ((group === this.globalStructsID) && (this.structsList[entry].split('.').length === 1)) {
        structSublist.push(this.structsList[entry]);
      }
      if (this.structsList[entry].indexOf(group + '.') === 0) {
        structSublist.push(this.structsList[entry]);
      }
    }
    return structSublist;
  }

  doConsoleLog(s) {
    console.warn('doConsoleLog', s);
  }

  private expandRecursive(node: TreeNode, isExpand: boolean) {
    node.expanded = isExpand;
    if (node.children) {
      node.children.forEach( childNode => {
        this.expandRecursive(childNode, isExpand);
      } );
    }
  }

}

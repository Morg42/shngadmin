
import {Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ViewRef, TemplateRef, ViewContainerRef} from '@angular/core';
import {AppConfigService} from '../../common/services/app-config.service';
import { HttpClient } from '@angular/common/http';

import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { TranslateService } from '@ngx-translate/core';

import { faSearch, faCircleNotch, faFolder, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { faSync, faList, faStop, faTrashAlt, faThumbtack } from '@fortawesome/free-solid-svg-icons';
// import { faCoffee } from '@fortawesome/free-solid-svg-icons';

import { TreeNode } from 'primeng/api';

import { cloneDeep } from 'lodash';

import { AppComponent } from '../../app.component';
import { OlddataService } from '../../common/services/olddata.service';
import { ItemTree } from '../../common/models/item-tree';
import { WebsocketService } from '../../common/services/websocket.service';
import { WebsocketPluginService } from '../../common/services/websocket-plugin.service';
import { SharedService } from '../../common/services/shared.service';
import {ItemDetails} from '../../common/models/item-details';
// import {ServerInfo} from '../../common/models/server-info';
import {ServerApiService} from '../../common/services/server-api.service';

import {Title} from '@angular/platform-browser';
import {Subscription} from 'rxjs';


@Component({
  selector: 'app-items',
  templateUrl: 'item-tree.component.html',
  styleUrls: ['item-tree.component.css'],
  providers:  [AppComponent, WebsocketService, WebsocketPluginService ]
})
export class ItemTreeComponent implements OnDestroy, OnInit, AfterViewInit {
  @ViewChild('vc', { read: ViewContainerRef, static: true }) vc: ViewContainerRef;
  @ViewChild('tpl', { read: TemplateRef, static: true }) tpl: TemplateRef<any>;

  childViewRef: ViewRef;

  faSearch = faSearch;
  faCircleNotch = faCircleNotch;
  faFolder = faFolder;
  faFolderOpen = faFolderOpen;
  faSync = faSync;
  faList = faList;
  faStop = faStop;
  faTrashAlt = faTrashAlt;
  faThumbtack = faThumbtack;

  itemcount = 0;
  itemtree: ItemTree;
  itemdetails: ItemDetails = <ItemDetails>{};
  itemdetailsloaded = false;

  monitoredItems: any[] = [];

  filesTree0: {}[];
  filteredTree: {}[];
  searchStart_param = {};
  treeIsFiltered = false;
  selectedFile: TreeNode;

  item_val: any;
  alertText = '';

  Object = Object;
  JSON = JSON;

  selectedNode;

  update_age = '';
  change_age = '';
  previous_update_age = '';
  previous_change_age = '';

  data: any;

  monitoredItemsUpdateSubscription: Subscription = null;

  modalRef: BsModalRef;
  constructor(private dataService: OlddataService,
              private dataServiceServer: ServerApiService,
              private appComponent: AppComponent,
              private translate: TranslateService,
              private websocketPluginService: WebsocketPluginService,
              private modalService: BsModalService,
              public shared: SharedService,
              private titleService: Title,
              private appConfig: AppConfigService) {
  }



  static resizeItemTree() {
    const browserHeight = window.innerHeight;
//    console.log({browserHeight});
    const tree = document.getElementById('tree');
    const treeDetail = document.getElementById('tree_detail');

    // const offsetTopDetail = treeDetail.offset().top;
    // initially offsetTop is off by a number of pixels. Correction: a fixed offset
    const offsetTop = 167;
    const offsetTopDetail = 200;
    const height = String(Math.round((-1) * (offsetTop) - 35 + browserHeight) + 'px');
    const heightDetail = String(Math.round((-1) * (offsetTopDetail) - 35 + browserHeight) + 'px');
    if (tree && treeDetail) {
      tree.style.height = height;
      tree.style.maxHeight = height;
      treeDetail.style.height = heightDetail;
      treeDetail.style.maxHeight = heightDetail;
    }
  }

  static htmlDecode(input) {
    const e = document.createElement('div');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? '' : e.childNodes[0].nodeValue;
  }


  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }


  ngOnInit() {
    console.log('ItemTreeComponent.ngOnInit:');

    this.dataServiceServer.getServerinfo()
      .subscribe(
        (response) => {
          this.setTitle(this.translate.instant('ITEMS.ITEMS'));
          this.getItemtree();
        }
      );

    window.addEventListener('resize', ItemTreeComponent.resizeItemTree, false);
    ItemTreeComponent.resizeItemTree();

    this.websocketPluginService.connect();
  }


  ngAfterViewInit() {
    this.childViewRef = this.tpl.createEmbeddedView(null);
  }

  insertChildView() {
    this.vc.insert(this.childViewRef);
  }

  removeChildView() {
    this.vc.detach();
  }


  reloadChildView() {
    this.removeChildView();
    setTimeout(() =>{
      this.insertChildView();
    }, 3000);
  }



  closeAlert(myalert, item_oldvalue) {
    this.item_val.value = item_oldvalue;
    myalert.hide();
  }


  ngOnDestroy(): void {
    window.removeEventListener('resize', ItemTreeComponent.resizeItemTree, false);
    this.monitoredItemsUpdateSubscription?.unsubscribe();
    this.websocketPluginService.disconnect();
  }


  getItemtree() {
    this.dataService.getItemtree()
      .subscribe(
        (response: [number, ItemTree]) => {
//          console.log('ItemsComponent: dataService.getItemtree()');
//          console.log(response);
          this.itemcount = response[0];
          this.filesTree0 = <any> response[1];
          this.filterNodes('');
          // this.plugininfo.sort(function (a, b) {return (a.pluginname > b.pluginname) ? 1 : ((b.pluginname > a.pluginname) ? -1 : 0)});
//          this.searchStart_param = {'number': String(this.appConfig.itemtreeSearchstart)};
          this.searchStart_param = {'number': String(this.appConfig.itemtreeSearchstart)};
        },
        (error) => {
          console.log('ERROR: ItemsComponent: dataService.getItemtree():');
          console.log(error);
        }
      );
  }


  updateValue(item_path, item_value, item_type, item_oldvalue, dialog) {

    console.log('ItemTreeComponent.updateValue:');
    console.log({item_path}, {item_value});

    if (typeof(item_value) === 'boolean') {
      item_value = item_value.toString();
      console.log('--> updateValue (bool): ' + item_value);
      this.dataService.changeItemValue(item_path, item_value);
      return;
    }

    if (item_type === 'num' || item_type === 'scene') {
      if (isNaN(item_value.value as any)) {
        this.item_val = item_value;
        this.alertText = this.translate.instant('ITEMS.ALERT.NOT NUMERIC');
        dialog.show();
        return;
      }
      if (item_type === 'scene' && (item_value.value < 0 || item_value.value > 63)) {
        this.item_val = item_value;
        this.alertText = this.translate.instant('ITEMS.ALERT.INVALID SCENE NUMBER');
        dialog.show();
        return;
      }
    }
    console.log('--> updateValue: ' + item_value.value);
    this.dataService.changeItemValue(item_path, item_value.value);
  }


/*

      $("#item_value" ).on('blur change', function() {
        $.ajax({
          url: 'item_change_value.html',
          type: 'POST',
          data: {
            'item_path': element.path,
            'value': $("#item_value").val()
          },
          success: function (response) {
            $( ".fa-sync" ).trigger( "click" );
          },
          error: function () {
            //your error code
          }
        });
      });
  */


  sortMonitoredItems() {
    this.monitoredItems.sort(function (a, b) {
      return (a[0].toLowerCase() > b[0].toLowerCase()) ? 1 :
        ((b[0].toLowerCase() > a[0].toLowerCase()) ? -1 :
            0
        );
    });
  }


  updateMonitoredItem(itempath, itemdata) {

    for (let i = 0; i < this.monitoredItems.length; i++) {
      if (this.monitoredItems[i][0] === itempath) {
        this.monitoredItems[i][1] = itemdata;
      }
    }

  }


  remove_none(caller) {
    const caller_array = caller.split(':');
    if ((caller_array.length === 1) || (caller_array[1].toLowerCase() === 'none')) {
      return caller_array[0];
    }
    return caller;
  }


  monitoredDataFunction(data) {
    // Callback function that receives the data from the websocket session
    this.data = data;
    const self = this;
    for (let i = 0; i < data.items.length; i++) {
      data.items[i][1].last_update_by = this.remove_none(data.items[i][1].last_update_by);
      data.items[i][1].last_change_by = this.remove_none(data.items[i][1].last_change_by);
      self.updateMonitoredItem(data.items[i][0], data.items[i][1]);
    }
  }


  monitorItem(path: string, monitorIt: boolean) {
    // path = 'wohnung.buero.schreibtischleuchte.onoff';

    console.log('monitorItem: path=' + path + ', monitorIt=' + String(monitorIt));
    if (monitorIt) {
      // start monitoring the item

      // this.getDetails(path);

      const data = {};
      data['value'] = this.itemdetails.value;
      data['last_update'] = this.itemdetails.last_update;
      data['last_change'] = this.itemdetails.last_change;
      data['last_update_by'] = this.itemdetails.updated_by;
      data['last_change_by'] = this.itemdetails.changed_by;

      const monItem = [path, data];
      this.monitoredItems.push(monItem);
      this.sortMonitoredItems();
      // bind the callback function to the context of the item-tree component
      const monitoredDataFunction = this.monitoredDataFunction.bind(this);
      this.websocketPluginService.getMonitoredItems(this.monitoredItems, monitoredDataFunction);
      this.getMonitoredValues();
    } else {
      // stop monitoring the item
      for (let i = this.monitoredItems.length - 1; i >= 0; i--) {
        if (this.monitoredItems[i][0] === path) {
          this.monitoredItems.splice(i, 1);
          // break;       //<-- Uncomment  if only the first term has to be removed
        }
      }
    }

    // console.log(this.monitoredItems);

  }


  isItemMonitored(path: string) {
    for (let i = this.monitoredItems.length - 1; i >= 0; i--) {
      if (this.monitoredItems[i][0] === path) {
        return true;
      }
    }
    return false;
  }


  getMonitoredValues() {
    console.log('getMonitoredValues()');
    this.monitoredItemsUpdateSubscription?.unsubscribe();
    this.monitoredItemsUpdateSubscription = this.websocketPluginService.monitoredItemsUpdate$.subscribe(() => {
      console.error('monitoredItemsUpdate$');
      // this.updateChartData(this.chartSystemload, this.chartdataLoad, this.websocketPluginService.monitor.items);
      console.log(this.websocketPluginService.monitor.items);
    });
  }

  getDetails(path: string) {
    console.log('ItemTreeComponent.getDetails: ' + path);
    console.warn('- this', this);
    if ((path !== undefined)) {
      this.dataService.getItemDetails(path)
        .subscribe(
          (response: ItemDetails[]) => {
            const details = response[0];
            details.value = ItemTreeComponent.htmlDecode(details.value);
            details.last_value = ItemTreeComponent.htmlDecode(details.last_value);
            details.previous_value = ItemTreeComponent.htmlDecode(details.previous_value);

            details.eval = ItemTreeComponent.htmlDecode(details.eval);

            details.hysteresis_input = ItemTreeComponent.htmlDecode(details.hysteresis_input);
            details.hysteresis_upper_threshold = ItemTreeComponent.htmlDecode(details.hysteresis_upper_threshold);
            details.hysteresis_lower_threshold = ItemTreeComponent.htmlDecode(details.hysteresis_lower_threshold);

            details.on_change = ItemTreeComponent.htmlDecode(details.on_change);
            details.on_update = ItemTreeComponent.htmlDecode(details.on_update);
            details.crontab = ItemTreeComponent.htmlDecode(details.crontab);

            if (details.type === 'bool') {
              details.value = (details.value.toLowerCase() === 'true');
            }
            this.showDetails(details);

            console.warn('getDetails', details.logics);
          },
          (error) => {
            console.log('ERROR: ItemsComponent: dataService.getItemDetails():');
            console.log(error);
          }
          );

    } else {
      this.showDetails();
    }
  }


  showDetails(response?) {
    console.log('showDetails:');
    console.log({response});

    if (response === undefined) {
      this.itemdetails = <ItemDetails>{};
      this.itemdetails.config = {};
      // this.itemdetails.value = item_value.value;

      this.update_age = this.shared.ageToString(0);
      this.change_age = this.shared.ageToString(0);
      this.previous_update_age = this.shared.ageToString(0);
      this.previous_change_age = this.shared.ageToString(0);
    } else {
      this.itemdetails = response;

      this.update_age = this.shared.ageToString(this.itemdetails.update_age);
      this.change_age = this.shared.ageToString(this.itemdetails.change_age);
      this.previous_update_age = this.shared.ageToString(this.itemdetails.previous_update_age);
      this.previous_change_age = this.shared.ageToString(this.itemdetails.previous_change_age);
    }
    this.itemdetailsloaded = true;
  }



/* ----------------------------------------------
  * For PrimeNG Tree:
*/

  filterTree(treeModel, value) {
    if (value.length >= String(this.appConfig.itemtreeSearchstart)) {
      this.filterNodes(value);
    } else {
      this.filterNodes('');
    }
  }

  filterNodes(value) {
//    console.log('ItemsComponent.filterTree: >' + value + '<')
    value = value.toLowerCase();
    this.filteredTree = cloneDeep(this.filesTree0);
    this.treeIsFiltered = false;
    if (value && value !== '') {
      this.treeIsFiltered = true;
      this.prune(this.filteredTree, value);
      this.expandAll();
    }
  }


  clearFilter(event, filter) {
    filter.value = '';
    this.filterTree(event, filter.value);
    this.itemdetailsloaded = false;
  }

  prune(array, filter) {
    for (let i = array.length - 1; i >= 0; i--) {
      const obj = array[i];
      if (obj.children) {
        if (this.prune(obj.children, filter)) {
          if (obj.children.length === 0) {
            array.splice(i, 1);
          }
          return true;
        }
      }
      if (obj.label.toLowerCase().indexOf(filter) === -1) {
        if (obj.children.length === 0) {
          array.splice(i, 1);
        }
      }
    }
  }


  nodeSelect(event) {
    console.log('Node Selected: ' + event.node.label);
    this.itemdetailsloaded = false;
    this.getDetails(event.node.path);

    }

  expandAll() {
    this.filteredTree.forEach( node => {
      this.expandRecursive(node, true);
    } );
  }

  collapseAll() {
    this.filteredTree.forEach( node => {
      this.expandRecursive(node, false);
    } );
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


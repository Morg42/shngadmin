import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { AppConfigService } from '../../common/services/app-config.service';

import { TranslateDirective, TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  faCircleNotch,
  faFolder,
  faFolderOpen,
  faList,
  faSearch,
  faStop,
  faSync,
  faThumbtack,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

import { PrimeTemplate, TreeNode } from 'primeng/api';
import { TreeNodeSelectEvent } from 'primeng/tree';

import { ItemDetails } from '../../common/models/item-details';
import { ItemTree } from '../../common/models/item-tree';
import { ItemsApiService } from '../../common/services/items-api.service';
import { LogService } from '../../common/services/log.service';
import { SharedService } from '../../common/services/shared.service';
import { WebsocketPluginService } from '../../common/services/websocket-plugin.service';
import { WebsocketService } from '../../common/services/websocket.service';

import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Bind } from 'primeng/bind';
import { Dialog } from 'primeng/dialog';
import { Ripple } from 'primeng/ripple';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { Tree } from 'primeng/tree';
import { Subscription } from 'rxjs';

type MonitoredItem = [string, Record<string, unknown>];

@Component({
  selector: 'app-items',
  templateUrl: 'item-tree.component.html',
  styleUrls: ['item-tree.component.css'],
  providers: [WebsocketService, WebsocketPluginService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Tabs,
    TabList,
    Ripple,
    Tab,
    TabPanels,
    TabPanel,
    Dialog,
    TranslateDirective,
    Tooltip,
    FaIconComponent,
    Tree,
    PrimeTemplate,
    ToggleSwitch,
    FormsModule,
    RouterLink,
    NgTemplateOutlet,
    TranslatePipe,
  ],
})
export class ItemTreeComponent implements OnDestroy, OnInit {
  @ViewChild('treeEl') private treeEl!: ElementRef<HTMLElement>;
  @ViewChild('treeDetailEl') private treeDetailEl!: ElementRef<HTMLElement>;

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
  itemtree!: ItemTree;
  itemdetails: ItemDetails = <ItemDetails>{};
  itemdetailsloaded = false;

  /** Delegate to SharedService (true root singleton) so the list survives
   *  navigation — WebsocketPluginService is component-scoped and gets destroyed */
  get monitoredItems(): MonitoredItem[] {
    return this.shared.monitoredItemsList;
  }

  filesTree0!: {}[];
  filteredTree!: {}[];
  searchStart_param = {};
  treeIsFiltered = false;
  selectedFile!: TreeNode;

  item_val!: { value: unknown };
  alertText = '';

  Object = Object;
  JSON = JSON;

  selectedNode: unknown;

  update_age = '';
  change_age = '';
  previous_update_age = '';
  previous_change_age = '';

  data: unknown;

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private itemsApi = inject(ItemsApiService);
  private translate = inject(TranslateService);
  private websocketPluginService = inject(WebsocketPluginService);
  public shared = inject(SharedService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  monitoredItemsUpdateSubscription: Subscription | null = null;

  showItemAlert = false;

  private readonly resizeHandler = () => this.resizeItemTree();

  resizeItemTree() {
    const browserHeight = window.innerHeight;
    const tree = this.treeEl?.nativeElement;
    const treeDetail = this.treeDetailEl?.nativeElement;

    // initially offsetTop is off by a number of pixels — correction via fixed offset
    const offsetTop = 167;
    const offsetTopDetail = 200;
    const height = String(Math.round(-1 * offsetTop - 35 + browserHeight) + 'px');
    const heightDetail = String(Math.round(-1 * offsetTopDetail - 35 + browserHeight) + 'px');
    if (tree && treeDetail) {
      tree.style.height = height;
      tree.style.maxHeight = height;
      treeDetail.style.height = heightDetail;
      treeDetail.style.maxHeight = heightDetail;
    }
  }

  static htmlDecode(input: string): string {
    if (!input) return '';
    // DOMParser creates an inert document — scripts are not executed and
    // resources are not loaded. textContent extracts plain text only.
    return new DOMParser().parseFromString(input, 'text/html').documentElement.textContent ?? '';
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('ItemTreeComponent.ngOnInit:');

    this.setTitle(this.translate.instant('ITEMS.ITEMS'));
    this.getItemtree();

    window.addEventListener('resize', this.resizeHandler, false);
    this.resizeItemTree();

    this.websocketPluginService.connect();

    // Re-register monitored items that survived navigation
    if (this.monitoredItems.length > 0) {
      const monitoredDataFunction = this.monitoredDataFunction.bind(this);
      this.websocketPluginService.getMonitoredItems(this.monitoredItems, monitoredDataFunction);
    }
  }

  closeAlert(item_oldvalue: unknown) {
    this.item_val.value = item_oldvalue;
    this.showItemAlert = false;
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler, false);
    this.monitoredItemsUpdateSubscription?.unsubscribe();
    this.websocketPluginService.disconnect();
  }

  getItemtree() {
    this.itemsApi
      .getItemTree()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const [itemcount, tree] = response as [number, ItemTree];
          this.itemcount = itemcount;
          this.filesTree0 = tree as unknown as {}[];
          this.filterNodes('');
          this.searchStart_param = { number: String(this.appConfig.itemtreeSearchstart) };
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.log.log('ERROR: ItemsComponent: itemsApi.getItemTree():');
          this.log.log(error);
        },
      });
  }

  updateValue(
    item_path: string,
    item_value: boolean | string | { value: string | number | null },
    item_type: string,
    item_oldvalue: unknown,
  ) {
    this.log.log('ItemTreeComponent.updateValue:');
    this.log.log({ item_path }, { item_value });

    if (typeof item_value === 'boolean') {
      const strValue = item_value.toString();
      this.log.log('--> updateValue (bool): ' + strValue);
      this.itemsApi
        .changeItemValue(item_path, strValue)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
      return;
    }

    if (typeof item_value === 'string') {
      this.log.log('--> updateValue (string): ' + item_value);
      this.itemsApi
        .changeItemValue(item_path, item_value)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
      return;
    }

    if (item_type === 'num' || item_type === 'scene') {
      const numVal = Number(item_value.value);
      if (isNaN(numVal)) {
        this.item_val = item_value;
        this.alertText = this.translate.instant('ITEMS.ALERT.NOT NUMERIC');
        this.showItemAlert = true;
        return;
      }
      if (item_type === 'scene' && (numVal < 0 || numVal > 63)) {
        this.item_val = item_value;
        this.alertText = this.translate.instant('ITEMS.ALERT.INVALID SCENE NUMBER');
        this.showItemAlert = true;
        return;
      }
    }
    this.log.log('--> updateValue: ' + item_value.value);
    this.itemsApi
      .changeItemValue(item_path, item_value.value ?? '')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  sortMonitoredItems() {
    this.monitoredItems.sort(function (a, b) {
      return a[0].toLowerCase() > b[0].toLowerCase()
        ? 1
        : b[0].toLowerCase() > a[0].toLowerCase()
          ? -1
          : 0;
    });
  }

  updateMonitoredItem(itempath: string, itemdata: unknown) {
    for (let i = 0; i < this.monitoredItems.length; i++) {
      if (this.monitoredItems[i][0] === itempath) {
        this.monitoredItems[i][1] = itemdata as Record<string, unknown>;
      }
    }
  }

  remove_none(caller: string) {
    const caller_array = caller.split(':');
    if (caller_array.length === 1 || caller_array[1].toLowerCase() === 'none') {
      return caller_array[0];
    }
    return caller;
  }

  monitoredDataFunction(raw: unknown) {
    // Callback function that receives the data from the websocket session
    const data = raw as { items: MonitoredItem[] };
    this.data = data;
    const self = this;
    for (let i = 0; i < data.items.length; i++) {
      data.items[i][1]['last_update_by'] = this.remove_none(
        data.items[i][1]['last_update_by'] as string,
      );
      data.items[i][1]['last_change_by'] = this.remove_none(
        data.items[i][1]['last_change_by'] as string,
      );
      self.updateMonitoredItem(data.items[i][0], data.items[i][1]);
    }
  }

  monitorItem(path: string, monitorIt: boolean) {
    // path = 'wohnung.buero.schreibtischleuchte.onoff';

    this.log.log('monitorItem: path=' + path + ', monitorIt=' + String(monitorIt));
    if (monitorIt) {
      // start monitoring the item

      // this.getDetails(path);

      const data: Record<string, unknown> = {};
      data['value'] = this.itemdetails.value;
      data['last_update'] = this.itemdetails.last_update;
      data['last_change'] = this.itemdetails.last_change;
      data['last_update_by'] = this.itemdetails.updated_by;
      data['last_change_by'] = this.itemdetails.changed_by;

      const monItem: MonitoredItem = [path, data as Record<string, unknown>];
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
          // NOTE: no break — all entries with this path are removed, not just the first
        }
      }
    }
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
    this.log.log('getMonitoredValues()');
    this.monitoredItemsUpdateSubscription?.unsubscribe();
    this.monitoredItemsUpdateSubscription = this.websocketPluginService.monitoredItemsUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.log.error('monitoredItemsUpdate$');
        this.log.log(this.websocketPluginService.monitor.items);
      });
  }

  getDetails(path: string) {
    this.log.log('ItemTreeComponent.getDetails: ' + path);
    this.log.warn('- this', this);
    if (path !== undefined) {
      this.itemsApi
        .getItemDetails(path)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            const details = (response as ItemDetails[])[0];
            details.value = ItemTreeComponent.htmlDecode(String(details.value));
            details.last_value = ItemTreeComponent.htmlDecode(details.last_value);
            details.previous_value = ItemTreeComponent.htmlDecode(details.previous_value);

            details.eval = ItemTreeComponent.htmlDecode(details.eval);

            details.hysteresis_input = ItemTreeComponent.htmlDecode(details.hysteresis_input);
            details.hysteresis_upper_threshold = ItemTreeComponent.htmlDecode(
              details.hysteresis_upper_threshold,
            );
            details.hysteresis_lower_threshold = ItemTreeComponent.htmlDecode(
              details.hysteresis_lower_threshold,
            );

            details.on_change = ItemTreeComponent.htmlDecode(details.on_change);
            details.on_update = ItemTreeComponent.htmlDecode(details.on_update);
            details.crontab = ItemTreeComponent.htmlDecode(details.crontab);

            if (details.type === 'bool') {
              details.value = String(details.value).toLowerCase() === 'true';
            }
            this.showDetails(details);

            this.log.warn('getDetails', details.logics);
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.log.log('ERROR: ItemsComponent: itemsApi.getItemDetails():');
            this.log.log(error);
          },
        });
    } else {
      this.showDetails();
    }
  }

  showDetails(response?: unknown) {
    this.log.log('showDetails:');
    this.log.log({ response });

    if (response === undefined) {
      this.itemdetails = <ItemDetails>{};
      this.itemdetails.config = {};
      this.update_age = this.shared.ageToString(0);
      this.change_age = this.shared.ageToString(0);
      this.previous_update_age = this.shared.ageToString(0);
      this.previous_change_age = this.shared.ageToString(0);
    } else {
      this.itemdetails = response as ItemDetails;

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

  filterTree(treeModel: unknown, value: string) {
    if (value.length >= Number(this.appConfig.itemtreeSearchstart)) {
      this.filterNodes(value);
    } else {
      this.filterNodes('');
    }
  }

  filterNodes(value: string) {
    value = value.toLowerCase();
    this.filteredTree = structuredClone(this.filesTree0);
    this.treeIsFiltered = false;
    if (value && value !== '') {
      this.treeIsFiltered = true;
      this.prune(this.filteredTree, value);
      this.expandAll();
    }
  }

  clearFilter(event: unknown, filter: { value: string }) {
    filter.value = '';
    this.filterTree(event, filter.value);
    this.itemdetailsloaded = false;
  }

  prune(array: TreeNode[], filter: string) {
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
      if ((obj.label ?? '').toLowerCase().indexOf(filter) === -1) {
        if ((obj.children ?? []).length === 0) {
          array.splice(i, 1);
        }
      }
    }
    return false;
  }

  nodeSelect(event: TreeNodeSelectEvent) {
    const node = event.node as TreeNode & { path: string };
    this.log.log('Node Selected: ' + node.label);
    this.itemdetailsloaded = false;
    this.getDetails(node.path);
  }

  expandAll() {
    this.filteredTree.forEach((node) => {
      this.expandRecursive(node, true);
    });
  }

  collapseAll() {
    this.filteredTree.forEach((node) => {
      this.expandRecursive(node, false);
    });
  }

  private expandRecursive(node: TreeNode, isExpand: boolean) {
    node.expanded = isExpand;
    if (node.children) {
      node.children.forEach((childNode) => {
        this.expandRecursive(childNode, isExpand);
      });
    }
  }
}

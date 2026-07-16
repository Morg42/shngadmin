import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { AppConfigService } from '../../common/services/app-config.service';
import { AttributeCatalogService } from '../../common/services/attribute-catalog.service';
import { CreateItemDialogComponent } from './create-item-dialog/create-item-dialog.component';
import { DeleteItemDialogComponent } from './delete-item-dialog/delete-item-dialog.component';
import { EditItemDialogComponent } from './edit-item-dialog/edit-item-dialog.component';
import { RenameItemDialogComponent } from './rename-item-dialog/rename-item-dialog.component';

import { TranslateDirective, TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  faCircleNotch,
  faEllipsisVertical,
  faFolder,
  faFolderOpen,
  faPlus,
  faSearch,
  faSync,
  faThumbtack,
} from '@fortawesome/free-solid-svg-icons';

import { MenuItem, PrimeTemplate, TreeNode } from 'primeng/api';
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
import { Menu } from 'primeng/menu';
import { Ripple } from 'primeng/ripple';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { Tree } from 'primeng/tree';
import { take } from 'rxjs/operators';
import { findAndExpandNodeByPath } from './item-tree-path.utils';

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
    CreateItemDialogComponent,
    EditItemDialogComponent,
    RenameItemDialogComponent,
    DeleteItemDialogComponent,
    Menu,
  ],
})
export class ItemTreeComponent implements OnDestroy, OnInit {
  /** Called imperatively from itemActionsMenuItems' Edit/Rename/Copy
   *  commands - see EditItemDialogComponent.open()'s doc comment for why.
   *  renameItemDialog is also read directly from the template, for the
   *  failed/copy-references badges next to the "more actions" button (see
   *  RenameItemDialogComponent's own doc comment on why those live here
   *  instead of inside that component's own dialogs). */
  private readonly editItemDialog = viewChild(EditItemDialogComponent);
  readonly renameItemDialog = viewChild(RenameItemDialogComponent);
  private readonly deleteItemDialog = viewChild(DeleteItemDialogComponent);

  faSearch = faSearch;
  faCircleNotch = faCircleNotch;
  faFolder = faFolder;
  faFolderOpen = faFolderOpen;
  faSync = faSync;
  faThumbtack = faThumbtack;
  faPlus = faPlus;
  faEllipsisVertical = faEllipsisVertical;

  readonly itemcount = signal(0);
  readonly itemdetails = signal<ItemDetails>(<ItemDetails>{});
  readonly itemdetailsloaded = signal(false);

  /** Bound to <app-create-item-dialog>'s [(visible)] - everything else about
   *  the create-item flow (fields, validation, submission) is self-contained
   *  there now. */
  readonly newItem_display = signal(false);

  /** Bound to <app-edit-item-dialog>'s [(visible)] - everything else about
   *  the edit-item flow (fields, validation, submission) is self-contained
   *  there now. */
  readonly editItem_display = signal(false);

  /** Bound to <app-rename-item-dialog>'s [(visible)] - everything else
   *  about the rename/copy flow (fields, validation, submission, the three
   *  satellite dialogs) is self-contained there now. */
  readonly renameItem_display = signal(false);
  /** Bound to <app-rename-item-dialog>'s [isCopy] - set by the "⋮" menu's
   *  Rename/Copy commands right before calling open(), see
   *  itemActionsMenuItems below. */
  readonly renameItemIsCopy = signal(false);

  /** Bound to <app-delete-item-dialog>'s [(visible)] - everything else
   *  about the delete flow (reference checks, cleanup, confirmation) is
   *  self-contained there now. */
  readonly deleteItem_display = signal(false);

  /** Delegate to SharedService (true root singleton) so the list survives
   *  navigation — WebsocketPluginService is component-scoped and gets destroyed.
   *  monitoredItemsList is a signal, so reading it here (from a getter invoked
   *  during template evaluation) keeps this reactive under OnPush. */
  get monitoredItems(): MonitoredItem[] {
    return this.shared.monitoredItemsList();
  }

  filesTree0!: {}[];
  readonly filteredTree = signal<{}[]>([]);
  readonly searchStart_param = signal<object>({});
  readonly treeIsFiltered = signal(false);
  selectedFile!: TreeNode;
  /** Average rendered row height (px) of a .p-tree-node-content, used
   *  by [virtualScrollItemSize] to compute how many rows fit in the
   *  viewport — measured at the default font size; rows don't wrap, so
   *  it stays accurate across the responsive font-size breakpoints too. */
  readonly treeVirtualScrollItemSize = 18;

  item_val!: { value: unknown };
  alertText = '';

  Object = Object;
  JSON = JSON;

  readonly update_age = signal('');
  readonly change_age = signal('');
  readonly previous_update_age = signal('');
  readonly previous_change_age = signal('');

  private readonly destroyRef = inject(DestroyRef);
  private itemsApi = inject(ItemsApiService);
  private translate = inject(TranslateService);
  private readonly attributeCatalogService = inject(AttributeCatalogService);
  private websocketPluginService = inject(WebsocketPluginService);
  public shared = inject(SharedService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  showItemAlert = false;

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
    this.attributeCatalogService.loadAttributeCatalog();

    // Defer the WebSocket connection until wsPort is available (same reasoning
    // as system.component — see serverReady$ comment there).
    this.appConfig.serverReady$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.websocketPluginService.connect();
      // Re-register monitored items that survived navigation or a reload
      // (SharedService restores paths from localStorage - see its comment).
      if (this.monitoredItems.length > 0) {
        const monitoredDataFunction = this.monitoredDataFunction.bind(this);
        this.websocketPluginService.getMonitoredItems(this.monitoredItems, monitoredDataFunction);
        this.fetchDataForEmptyMonitoredItems();
      }
    });
  }

  /** Items restored from localStorage start with an empty data placeholder -
   *  the websocket only pushes a fresh value on the item's NEXT change,
   *  which could be a long wait for a rarely-changing item, so fetch each
   *  placeholder's current details right away instead of leaving it blank. */
  private fetchDataForEmptyMonitoredItems() {
    for (const [path, data] of this.monitoredItems) {
      if (Object.keys(data).length > 0) continue;
      this.itemsApi
        .getItemDetails(path)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((response) => {
          const details = (response as ItemDetails[])[0];
          if (!details) return;
          this.applyMonitoredDataUpdates(
            new Map([
              [
                path,
                {
                  value: details.value,
                  last_update: details.last_update,
                  last_change: details.last_change,
                  last_update_by: details.updated_by,
                  last_change_by: details.changed_by,
                },
              ],
            ]),
          );
        });
    }
  }

  closeAlert(item_oldvalue: unknown) {
    this.item_val.value = item_oldvalue;
    this.showItemAlert = false;
  }

  ngOnDestroy(): void {
    this.websocketPluginService.disconnect();
  }

  /** Rebuilding filteredTree (via structuredClone in filterNodes()) creates new
   *  TreeNode objects, so any prior selection no longer matches by reference and
   *  the details panel appears to lose its selection. Pass selectPath (e.g. the
   *  path just created) to re-resolve and re-select the equivalent node by path
   *  once the new tree is in place. */
  getItemtree(selectPath?: string) {
    this.itemsApi
      .getItemTree()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const [itemcount, tree] = response as [number, ItemTree];
          this.itemcount.set(itemcount);
          this.filesTree0 = tree as unknown as {}[];
          this.filterNodes('');
          this.searchStart_param.set({
            number: String(Number(this.appConfig.itemtreeSearchstart) || 3),
          });
          if (selectPath) {
            this.selectNodeByPath(selectPath);
          }
        },
        error: (error) => {
          this.log.log('ERROR: ItemsComponent: itemsApi.getItemTree():');
          this.log.log(error);
        },
      });
  }

  private selectNodeByPath(path: string) {
    const node = findAndExpandNodeByPath(
      this.filteredTree() as (TreeNode & { path: string })[],
      path,
    );
    if (node) {
      this.selectedFile = node;
      this.getDetails(path);
    }
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
    this.shared.monitoredItemsList.update((items) =>
      [...items].sort((a, b) =>
        a[0].toLowerCase() > b[0].toLowerCase()
          ? 1
          : b[0].toLowerCase() > a[0].toLowerCase()
            ? -1
            : 0,
      ),
    );
  }

  remove_none(caller: string) {
    const caller_array = caller.split(':');
    if (caller_array.length === 1 || caller_array[1].toLowerCase() === 'none') {
      return caller_array[0];
    }
    return caller;
  }

  /** Callback handed to WebsocketPluginService.getMonitoredItems() - invoked
   *  directly from handleResponseItem() on every 'item' websocket message, so
   *  this is the only place monitored values actually get updated. Publishes
   *  one new array (immutable update) covering every item in the message,
   *  rather than one signal write per item. */
  monitoredDataFunction(raw: unknown) {
    const data = raw as { items: MonitoredItem[] };
    const updates = new Map<string, Record<string, unknown>>();
    for (const [path, itemdata] of data.items) {
      itemdata['last_update_by'] = this.remove_none(itemdata['last_update_by'] as string);
      itemdata['last_change_by'] = this.remove_none(itemdata['last_change_by'] as string);
      updates.set(path, itemdata);
    }
    this.applyMonitoredDataUpdates(updates);
  }

  /** Immutably patches the data half of every [path, data] entry in
   *  shared.monitoredItemsList whose path is a key of updates, leaving
   *  other entries untouched - shared by the websocket push handler above
   *  and the one-off details fetch for restored placeholder rows. */
  private applyMonitoredDataUpdates(updates: Map<string, Record<string, unknown>>) {
    this.shared.monitoredItemsList.update((items) =>
      items.map((item) => (updates.has(item[0]) ? [item[0], updates.get(item[0])!] : item)),
    );
  }

  monitorItem(path: string, monitorIt: boolean) {
    // path = 'wohnung.buero.schreibtischleuchte.onoff';

    this.log.log('monitorItem: path=' + path + ', monitorIt=' + String(monitorIt));
    if (monitorIt) {
      // start monitoring the item

      // this.getDetails(path);

      const details = this.itemdetails();
      const data: Record<string, unknown> = {};
      data['value'] = details.value;
      data['last_update'] = details.last_update;
      data['last_change'] = details.last_change;
      data['last_update_by'] = details.updated_by;
      data['last_change_by'] = details.changed_by;

      const monItem: MonitoredItem = [path, data as Record<string, unknown>];
      this.shared.monitoredItemsList.update((items) => [...items, monItem]);
      this.sortMonitoredItems();
      // bind the callback function to the context of the item-tree component
      const monitoredDataFunction = this.monitoredDataFunction.bind(this);
      this.websocketPluginService.getMonitoredItems(this.monitoredItems, monitoredDataFunction);
    } else {
      // stop monitoring the item — removes all entries with this path, not just the first
      this.shared.monitoredItemsList.update((items) => items.filter((item) => item[0] !== path));
    }
  }

  isItemMonitored(path: string) {
    return this.shared.monitoredItemsList().some((item) => item[0] === path);
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

  /** Backend returns the source filename without extension (since shng dyn-item); display it
   *  consistently with how filenames are shown elsewhere in the app (e.g. item-configuration). */
  get definedInFilename(): string {
    const filename = this.itemdetails().filename;
    return filename && !filename.endsWith('.yaml') ? filename + '.yaml' : filename;
  }

  showDetails(response?: unknown) {
    this.log.log('showDetails:');
    this.log.log({ response });

    if (response === undefined) {
      const details = <ItemDetails>{};
      details.config = {};
      this.itemdetails.set(details);
      this.update_age.set(this.shared.ageToString(0));
      this.change_age.set(this.shared.ageToString(0));
      this.previous_update_age.set(this.shared.ageToString(0));
      this.previous_change_age.set(this.shared.ageToString(0));
    } else {
      const details = response as ItemDetails;
      this.itemdetails.set(details);
      this.update_age.set(this.shared.ageToString(details.update_age));
      this.change_age.set(this.shared.ageToString(details.change_age));
      this.previous_update_age.set(this.shared.ageToString(details.previous_update_age));
      this.previous_change_age.set(this.shared.ageToString(details.previous_change_age));
    }
    this.itemdetailsloaded.set(true);
  }

  /* ----------------------------------------------
   * For PrimeNG Tree:
   */

  /** appConfig.itemtreeSearchstart is undefined until the async
   *  /api/server/info response patches it in — Number(undefined) is
   *  NaN, and every comparison with NaN is false, so typing before that
   *  response lands would silently never filter at all. Falls back to
   *  AppConfigService's own DEFAULT_CONFIG value (3) for that window. */
  filterTree(treeModel: unknown, value: string) {
    const threshold = Number(this.appConfig.itemtreeSearchstart) || 3;
    if (value.length >= threshold) {
      this.filterNodes(value);
    } else {
      this.filterNodes('');
    }
  }

  filterNodes(value: string) {
    value = value.toLowerCase();
    const tree = structuredClone(this.filesTree0);
    if (value && value !== '') {
      this.prune(tree as TreeNode[], value);
      this.filteredTree.set(tree);
      this.treeIsFiltered.set(true);
      this.expandAll();
    } else {
      this.filteredTree.set(tree);
      this.treeIsFiltered.set(false);
    }
  }

  clearFilter(event: unknown, filter: { value: string }) {
    filter.value = '';
    this.filterTree(event, filter.value);
    this.itemdetailsloaded.set(false);
  }

  /** Removes every node (and its whole subtree) that neither matches
   *  *filter* itself nor has any descendant that does, mutating *array*
   *  in place. Recurses into children BEFORE deciding whether to keep
   *  the node, and never returns early out of the loop — every sibling
   *  at every level gets evaluated, regardless of where a match is
   *  found elsewhere in the tree. */
  prune(array: TreeNode[], filter: string): boolean {
    let anyKept = false;
    for (let i = array.length - 1; i >= 0; i--) {
      const obj = array[i];
      if (obj.children) {
        this.prune(obj.children, filter);
      }
      const ownMatch = (obj.label ?? '').toLowerCase().indexOf(filter) !== -1;
      const hasMatchingChildren = (obj.children?.length ?? 0) > 0;
      if (ownMatch || hasMatchingChildren) {
        anyKept = true;
      } else {
        array.splice(i, 1);
      }
    }
    return anyKept;
  }

  nodeSelect(event: TreeNodeSelectEvent) {
    const node = event.node as TreeNode & { path: string };
    this.log.log('Node Selected: ' + node.label);
    this.itemdetailsloaded.set(false);
    this.getDetails(node.path);
  }

  expandAll() {
    this.filteredTree().forEach((node) => {
      this.expandRecursive(node as TreeNode, true);
    });
  }

  collapseAll() {
    this.filteredTree().forEach((node) => {
      this.expandRecursive(node as TreeNode, false);
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

  /** Menu model for the "more actions" (⋮) popup — Edit/Rename/Copy/Delete,
   *  replacing what used to be four separate buttons in the item-detail card's
   *  header, which didn't scale to narrow/mobile layouts. None of the entries
   *  are individually disabled: a disabled PrimeNG MenuItem doesn't fire its
   *  click handler at all, so there'd be no way to explain why short of a
   *  tooltip on a disabled element, which has its own hover problems (see the
   *  standalone Copy button's earlier fix, before it moved in here). Copy
   *  always opens its dialog and explains a non-persisted item's disabled
   *  state inline in the dialog body instead. */
  get itemActionsMenuItems(): MenuItem[] {
    return [
      {
        label: this.translate.instant('BUTTON.EDIT'),
        icon: 'pi pi-pencil',
        command: () => this.editItemDialog()?.open(),
      },
      {
        label: this.translate.instant('BUTTON.RENAME'),
        icon: 'pi pi-arrow-right-arrow-left',
        command: () => {
          this.renameItemIsCopy.set(false);
          this.renameItemDialog()?.open();
        },
      },
      {
        label: this.translate.instant('BUTTON.COPY'),
        icon: 'pi pi-copy',
        command: () => {
          this.renameItemIsCopy.set(true);
          this.renameItemDialog()?.open();
        },
      },
      { separator: true },
      {
        label: this.translate.instant('BUTTON.DELETE'),
        icon: 'pi pi-trash',
        styleClass: 'menu-item-danger',
        command: () => this.deleteItemDialog()?.open(),
      },
    ];
  }

  /** deleted output handler for <app-delete-item-dialog> - nothing to
   *  re-select after a delete (unlike create/rename/copy), just clear the
   *  now-gone item's details and reload the tree. */
  onItemDeleted() {
    this.showDetails();
    this.getItemtree();
  }
}

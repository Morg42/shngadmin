import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { AppConfigService } from '../../common/services/app-config.service';
import { AttributeValueInputComponent } from '../attribute-value-input/attribute-value-input.component';

import { TranslateDirective, TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  faCircleNotch,
  faFolder,
  faFolderOpen,
  faList,
  faPen,
  faPlus,
  faRightLeft,
  faSearch,
  faStop,
  faSync,
  faThumbtack,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

import { MessageService, PrimeTemplate, SelectItem, TreeNode } from 'primeng/api';
import { TreeNodeSelectEvent } from 'primeng/tree';

import { HttpErrorResponse } from '@angular/common/http';
import { ItemAttributeInfo } from '../../common/models/item-attribute-info';
import { ItemDetails } from '../../common/models/item-details';
import { ItemReference } from '../../common/models/item-reference';
import { ItemTree } from '../../common/models/item-tree';
import { PlugininfoType } from '../../common/models/plugin-info';
import { FilesApiService } from '../../common/services/files-api.service';
import { ItemsApiService } from '../../common/services/items-api.service';
import { LogService } from '../../common/services/log.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { SharedService } from '../../common/services/shared.service';
import { WebsocketPluginService } from '../../common/services/websocket-plugin.service';
import { WebsocketService } from '../../common/services/websocket.service';

import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AutoComplete } from 'primeng/autocomplete';
import { Bind } from 'primeng/bind';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Ripple } from 'primeng/ripple';
import { Select } from 'primeng/select';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { Tree } from 'primeng/tree';
import { forkJoin, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

type MonitoredItem = [string, Record<string, unknown>];

/** attributeCatalog entry, tagged with where it came from ('core' or a plugin
 *  name) so the attribute browser can group suggestions by source. */
interface AttributeCatalogEntry extends ItemAttributeInfo {
  source: string;
}

interface AttributeGroup {
  source: string;
  entries: { name: string; entry: AttributeCatalogEntry }[];
}

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
    AutoComplete,
    InputText,
    Select,
    AttributeValueInputComponent,
    ProgressSpinner,
  ],
})
export class ItemTreeComponent implements OnDestroy, OnInit {
  @ViewChildren('attrNameInput', { read: ElementRef })
  private attrNameInputs!: QueryList<ElementRef<HTMLElement>>;
  /** Separate from attrNameInputs — PrimeNG dialogs may keep their content
   *  mounted (just hidden) while closed, so a shared ref name across both
   *  dialogs' row loops could mix rows from both into one QueryList. */
  @ViewChildren('editAttrNameInput', { read: ElementRef })
  private editAttrNameInputs!: QueryList<ElementRef<HTMLElement>>;

  faSearch = faSearch;
  faCircleNotch = faCircleNotch;
  faFolder = faFolder;
  faFolderOpen = faFolderOpen;
  faSync = faSync;
  faList = faList;
  faStop = faStop;
  faTrashAlt = faTrashAlt;
  faThumbtack = faThumbtack;
  faPlus = faPlus;
  faPen = faPen;
  faRightLeft = faRightLeft;

  itemcount = 0;
  itemtree!: ItemTree;
  itemdetails: ItemDetails = <ItemDetails>{};
  itemdetailsloaded = false;

  /** Core + plugin item attributes, keyed by name, loaded from the backend
   *  (items/attributes and plugins/info) and offered as autocomplete suggestions
   *  when adding free-text attributes to a new item. Also the source for the
   *  "type" field's value list and for attribute hint text. */
  attributeCatalog: Record<string, AttributeCatalogEntry> = {};
  attributeCatalogLoaded = false;
  /** Same data as attributeCatalog, pre-grouped by source ('core' first, then
   *  plugins alphabetically) for the attribute browser dialog. */
  attributeGroups: AttributeGroup[] = [];

  attributeBrowser_display = false;
  attributeBrowserSearch = '';

  get itemTypeOptions(): SelectItem[] {
    const validList = this.attributeCatalog['type']?.valid_list ?? [];
    return validList.map((t) => ({ label: t, value: t }));
  }

  /** name/type have their own dedicated dialog fields, so they're excluded from
   *  the free-text attribute autocomplete suggestions. */
  private static readonly ATTRIBUTES_WITH_DEDICATED_FIELDS = ['name', 'type'];

  newItem_display = false;
  newItemParent = '';
  newItemName = '';
  newItemType = 'str';
  newItemPersist = true;
  newItemFilename = '';
  newItemAttributes: { key: string; value: unknown }[] = [];
  filteredAttributeNames: string[] = [];
  itemFilenames: string[] = [];
  filteredItemFiles: string[] = [];
  newItemError = '';

  editItem_display = false;
  editItemType = 'str';
  editItemAttributes: { key: string; value: unknown }[] = [];
  editItemError = '';

  renameItem_display = false;
  /** Single field, doing double duty: a bare name ("switch") renames in
   *  place under whatever parent is currently selected in the tree below;
   *  a dotted path ("a.b.switch") is used as the complete new path as-is,
   *  for power users who'd rather type than click through the tree.
   *  Clicking a tree node rewrites just this string's parent-prefix,
   *  keeping whatever leaf segment was already typed — the two input
   *  methods cooperate on the same field rather than fighting over it. */
  renameItemNewPathInput = '';
  renameItemSelectedParentNode: TreeNode | undefined;
  renameItemError = '';
  /** True while a rename/create-missing-parent request is in flight —
   *  renaming can take a while if a plugin pauses to reconnect to real
   *  hardware/network, and with no other feedback users have been known
   *  to assume it's stuck and try to cancel. */
  renameItemSubmitting = false;
  /** Set after a successful rename/move that left some references
   *  un-rewritten — kept around (not on a toast timer) until the next
   *  rename/move, so the user can come back to it later, not just catch
   *  it in the few seconds before a toast disappears. */
  renameItemLastFailedReferences: [string, string][] = [];
  renameFailedReferencesDetail_display = false;

  /** Synthetic node prepended to the rename dialog's tree picker — the
   *  real tree has no clickable "top level" node of its own. path: ''
   *  flows straight through selectRenameParent()'s normal logic. */
  private static readonly TOP_LEVEL_TREE_NODE = {
    label: '',
    path: '',
    icon: 'pi pi-home',
    selectable: true,
  };

  get renameItemParentTreeNodes(): {}[] {
    return [
      {
        ...ItemTreeComponent.TOP_LEVEL_TREE_NODE,
        label: this.translate.instant('ITEMS.TOP_LEVEL'),
      },
      ...(this.filteredTree ?? []),
    ];
  }

  /** Set when a rename attempt fails specifically because the target's
   *  parent doesn't exist yet — offered to the user as "create these
   *  first?" rather than just a dead-end error. */
  renameItemMissingAncestors: string[] = [];
  renameItemConfirmCreateParents_display = false;

  /** The attribute browser dialog and the name autocomplete/used-keys
   *  filtering are shared between the create and edit dialogs (same UI,
   *  same exclusion rules) — this tracks which one is currently open, so
   *  searchAttributeNames()/filteredAttributeGroups()/
   *  selectAttributeFromBrowser() read from and write back to the right
   *  row array without the two dialogs needing separate copies of that logic. */
  private activeAttributeDialog: 'create' | 'edit' = 'create';

  private get activeAttributeRows(): { key: string; value: unknown }[] {
    return this.activeAttributeDialog === 'edit' ? this.editItemAttributes : this.newItemAttributes;
  }

  private set activeAttributeRows(rows: { key: string; value: unknown }[]) {
    if (this.activeAttributeDialog === 'edit') {
      this.editItemAttributes = rows;
    } else {
      this.newItemAttributes = rows;
    }
  }

  deleteItem_display = false;
  deleteItemReferences: ItemReference[] | null = null;
  deleteItemReferencesFailed = false;
  deleteItemError = '';
  deleteItemPersist = true;
  deleteItemCleanupReferences = true;
  deleteItemCleanupFailed = false;
  /** Separate, unchecked-by-default acknowledgement — deleting sub-items
   *  loses real, possibly substantial existing config, unlike the
   *  auto-created (always-empty) ancestors on the create-item side, so
   *  this needs an explicit opt-in rather than just a button-label
   *  change. */
  deleteItemConfirmChildren = false;

  /** trigger/hysteresis_input matches are always unambiguous by construction
   *  (a bare-path attribute either matches or it doesn't — no partial
   *  dependency is possible), so "ambiguous" only ever occurs in the
   *  eval-family. Sorted ambiguous-first, then eval-family-before-structural
   *  within the unambiguous group, so the rows needing real human attention
   *  ("can't clean, will break") lead, the ones merely losing an expression
   *  ("can clean, but copy it first") come next, and purely mechanical ones
   *  trail at the bottom. */
  private static readonly STRUCTURAL_REFERENCE_ATTRIBUTES = ['trigger', 'hysteresis_input'];

  private sortReferencesForReview(refs: ItemReference[]): ItemReference[] {
    const rank = (ref: ItemReference): [number, number, string] => [
      ref.unambiguous ? 1 : 0,
      ItemTreeComponent.STRUCTURAL_REFERENCE_ATTRIBUTES.includes(ref.attribute) ? 1 : 0,
      ref.item,
    ];
    return [...refs].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      return ra[0] - rb[0] || ra[1] - rb[1] || ra[2].localeCompare(rb[2]);
    });
  }

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
  /** Average rendered row height (px) of a .p-tree-node-content, used
   *  by [virtualScrollItemSize] to compute how many rows fit in the
   *  viewport — measured at the default font size; rows don't wrap, so
   *  it stays accurate across the responsive font-size breakpoints too. */
  readonly treeVirtualScrollItemSize = 18;

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
  private filesApi = inject(FilesApiService);
  private pluginsApi = inject(PluginsApiService);
  private translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);
  private websocketPluginService = inject(WebsocketPluginService);
  public shared = inject(SharedService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  monitoredItemsUpdateSubscription: Subscription | null = null;

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
    this.loadAttributeCatalog();

    // Defer the WebSocket connection until wsPort is available (same reasoning
    // as system.component — see serverReady$ comment there).
    this.appConfig.serverReady$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.websocketPluginService.connect();
      // Re-register monitored items that survived navigation
      if (this.monitoredItems.length > 0) {
        const monitoredDataFunction = this.monitoredDataFunction.bind(this);
        this.websocketPluginService.getMonitoredItems(this.monitoredItems, monitoredDataFunction);
      }
    });
  }

  closeAlert(item_oldvalue: unknown) {
    this.item_val.value = item_oldvalue;
    this.showItemAlert = false;
  }

  ngOnDestroy(): void {
    this.monitoredItemsUpdateSubscription?.unsubscribe();
    this.websocketPluginService.disconnect();
  }

  /** Combines the core attribute catalog (items/attributes) with every loaded
   *  plugin's item attributes (plugins/info) into one lookup, keyed by name.
   *  name/type are excluded from the plugin merge — they have dedicated dialog
   *  fields and "type" specifically must keep core's valid_list (the item-type
   *  enum), not get clobbered by an unrelated plugin attribute that happens to
   *  share the name "type". On any other name collision the later entry wins —
   *  cosmetic only, doesn't change which attribute names are offered, just
   *  whose type/description is shown. */
  loadAttributeCatalog() {
    forkJoin([this.itemsApi.getCoreItemAttributes(), this.pluginsApi.getPluginsInfo()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([coreAttributes, pluginsInfo]) => {
        const catalog: Record<string, AttributeCatalogEntry> = {};
        for (const [name, info] of Object.entries(coreAttributes)) {
          catalog[name] = { ...info, source: 'core' };
        }
        for (const plugin of (pluginsInfo as PlugininfoType[]) ?? []) {
          for (const attr of plugin.attributes ?? []) {
            if (ItemTreeComponent.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(attr.name)) continue;
            catalog[attr.name] = { ...attr, source: plugin.pluginname };
          }
        }
        this.attributeCatalog = catalog;
        this.attributeGroups = this.buildAttributeGroups(catalog);
        this.attributeCatalogLoaded = true;
        this.cdr.markForCheck();
      });
  }

  private buildAttributeGroups(catalog: Record<string, AttributeCatalogEntry>): AttributeGroup[] {
    const bySource = new Map<string, { name: string; entry: AttributeCatalogEntry }[]>();
    for (const [name, entry] of Object.entries(catalog)) {
      if (ItemTreeComponent.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(name)) continue;
      const list = bySource.get(entry.source) ?? [];
      list.push({ name, entry });
      bySource.set(entry.source, list);
    }
    for (const list of bySource.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    const sources = [...bySource.keys()].sort((a, b) =>
      a === 'core' ? -1 : b === 'core' ? 1 : a.localeCompare(b),
    );
    return sources.map((source) => ({ source, entries: bySource.get(source)! }));
  }

  /** Description of the given attribute name in the active UI language, falling
   *  back to English, or '' if no entry/description exists — used as hint text
   *  in the new-item dialog's attribute rows. */
  attributeDescription(key: string): string {
    const description = this.attributeCatalog[key]?.description;
    if (!description) return '';
    const lang = this.translate.currentLang as 'de' | 'en';
    return description[lang] ?? description.en ?? description.de ?? '';
  }

  /** Declared type for the attribute-value-input control — '' (its default,
   *  plain text) for an attribute name not yet chosen or not in the catalog
   *  (e.g. a still-unknown plugin attribute). */
  attributeType(key: string): string {
    return this.attributeCatalog[key]?.type ?? '';
  }

  attributeValidList(key: string): string[] | undefined {
    return this.attributeCatalog[key]?.valid_list;
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
          this.itemcount = itemcount;
          this.filesTree0 = tree as unknown as {}[];
          this.filterNodes('');
          this.searchStart_param = {
            number: String(Number(this.appConfig.itemtreeSearchstart) || 3),
          };
          if (selectPath) {
            this.selectNodeByPath(selectPath);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.log.log('ERROR: ItemsComponent: itemsApi.getItemTree():');
          this.log.log(error);
        },
      });
  }

  private selectNodeByPath(path: string) {
    const node = this.findAndExpandNodeByPath(
      this.filteredTree as (TreeNode & { path: string })[],
      path,
    );
    if (node) {
      this.selectedFile = node;
      this.getDetails(path);
    }
  }

  private findAndExpandNodeByPath(
    nodes: (TreeNode & { path: string })[],
    path: string,
  ): (TreeNode & { path: string }) | null {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = this.findAndExpandNodeByPath(
          node.children as (TreeNode & { path: string })[],
          path,
        );
        if (found) {
          node.expanded = true;
          return found;
        }
      }
    }
    return null;
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

  /** Backend returns the source filename without extension (since shng dyn-item); display it
   *  consistently with how filenames are shown elsewhere in the app (e.g. item-configuration). */
  get definedInFilename(): string {
    const filename = this.itemdetails.filename;
    return filename && !filename.endsWith('.yaml') ? filename + '.yaml' : filename;
  }

  /** False for purely runtime items (never persisted to a file) — the backend
   *  returns the literal string 'None' for those, same as openNewItemDialog()'s
   *  parent-filename check below. The delete dialog's persist toggle is
   *  meaningless for these (nothing to remove from a file), so it gets
   *  disabled rather than offering a choice that has no effect either way. */
  get deleteItemHasFile(): boolean {
    const filename = this.itemdetails.filename;
    return !!filename && filename !== 'None';
  }

  /** selectedFile is the tree node for whatever's currently shown in the
   *  details pane — same node the delete dialog operates on — so its own
   *  children array (already loaded with the rest of the tree, no extra
   *  fetch needed) is a reliable source for "does this item have
   *  sub-items". */
  get deleteItemHasChildren(): boolean {
    return (this.selectedFile?.children?.length ?? 0) > 0;
  }

  /** Total sub-items across the whole subtree, not just direct children —
   *  a chain of auto-created ancestors (e.g. from create-item's mkdir -p
   *  path) can nest several levels deep, and the delete confirmation must
   *  reflect everything that's actually about to be removed, including
   *  deeper descendants that may carry real config (unlike the empty
   *  intermediate levels above them). */
  get deleteItemDescendantCount(): number {
    return this.selectedFile ? ItemTreeComponent.countDescendants(this.selectedFile) : 0;
  }

  private static countDescendants(node: TreeNode): number {
    const children = node.children ?? [];
    return children.reduce((sum, child) => sum + 1 + ItemTreeComponent.countDescendants(child), 0);
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

  /* ----------------------------------------------
   * Create item
   */

  get newItemFullPath(): string {
    return this.newItemParent ? this.newItemParent + '.' + this.newItemName : this.newItemName;
  }

  /** No dot in the full path: identical to the original single-segment
   *  check. A dot present (parent, name, or both contributing extra
   *  levels — e.g. typing a multi-level path directly into Name): every
   *  dot-separated segment of the whole path must independently be a
   *  legal item name, since each one is either an existing item (already
   *  valid by construction) or gets auto-created as a new one. */
  get newItemNameValid(): boolean {
    return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/.test(this.newItemFullPath);
  }

  /** Ancestors of newItemFullPath that don't exist yet — e.g. typing a
   *  parent path several levels deep in one go, mkdir -p style. Computed
   *  against a snapshot fetched once when the dialog opens (see
   *  openNewItemDialog()); a stale snapshot just means a chain-creation
   *  step below fails with a normal collision error, same "no rollback,
   *  no special-case" tradeoff as rename's identical mechanism. */
  get newItemMissingAncestors(): string[] {
    return ItemTreeComponent.computeMissingAncestors(this.newItemFullPath, this.newItemKnownPaths);
  }

  private newItemKnownPaths = new Set<string>();

  openNewItemDialog() {
    this.activeAttributeDialog = 'create';
    this.newItemParent = this.itemdetails?.path ?? '';
    this.newItemName = '';
    this.newItemType = 'str';
    this.newItemPersist = true;
    // Overwritable default: the parent's own file, so the new item stays next
    // to related config. Empty (top-level, no parent) falls through to the
    // backend's own default (sh._created_items_file) when persisting.
    const parentFilename = this.itemdetails?.filename;
    this.newItemFilename = parentFilename && parentFilename !== 'None' ? parentFilename : '';
    this.newItemAttributes = [];
    this.newItemError = '';
    this.newItem_display = true;

    this.itemsApi
      .getItemList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paths) => {
        this.newItemKnownPaths = new Set(paths as string[]);
        this.cdr.markForCheck();
      });

    if (this.itemFilenames.length === 0) {
      this.filesApi
        .getfileList('items')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((response) => {
          this.itemFilenames = (response as string[])
            .filter((f) => f.toLowerCase().endsWith('.yaml'))
            .map((f) => f.slice(0, -5));
        });
    }
  }

  addAttributeRow() {
    this.newItemAttributes = [...this.newItemAttributes, { key: '', value: '' }];
    // QueryList only reflects the new row's input after this view update
    // finishes rendering, so focus has to happen on the next macrotask.
    setTimeout(() => this.attrNameInputs?.last?.nativeElement.querySelector('input')?.focus());
  }

  removeAttributeRow(index: number) {
    this.newItemAttributes = this.newItemAttributes.filter((_, i) => i !== index);
  }

  /** currentRow is the row being typed into - excluded from the "already
   *  used elsewhere" check, otherwise its own live-typed value (e.g. typing
   *  "cache" updates attr.key to "cache" as you type) would hide the exact
   *  match from its own suggestions, showing only longer/different names. */
  searchAttributeNames(event: { query: string }, currentRow?: { key: string; value: unknown }) {
    const q = event.query.toLowerCase();
    const used = this.activeAttributeRows.filter((a) => a !== currentRow).map((a) => a.key);
    this.filteredAttributeNames = Object.keys(this.attributeCatalog).filter(
      (a) =>
        a.toLowerCase().includes(q) &&
        !used.includes(a) &&
        !ItemTreeComponent.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(a),
    );
  }

  get filteredAttributeGroups(): AttributeGroup[] {
    const q = this.attributeBrowserSearch.toLowerCase();
    const used = this.activeAttributeRows.map((a) => a.key);
    return this.attributeGroups
      .map((group) => ({
        source: group.source,
        entries: group.entries.filter(
          ({ name, entry }) =>
            !used.includes(name) &&
            (name.toLowerCase().includes(q) ||
              (entry.description?.[this.translate.currentLang as 'de' | 'en'] ?? '')
                .toLowerCase()
                .includes(q)),
        ),
      }))
      .filter((group) => group.entries.length > 0);
  }

  openAttributeBrowser() {
    this.attributeBrowserSearch = '';
    this.attributeBrowser_display = true;
  }

  /** Fills the first empty attribute row with the chosen name (adding a new
   *  row if none is empty), then closes the browser. Acts on whichever
   *  dialog (create/edit) is currently open — see activeAttributeRows. */
  selectAttributeFromBrowser(name: string) {
    const rows = this.activeAttributeRows;
    const emptyRowIndex = rows.findIndex((a) => a.key === '');
    this.activeAttributeRows =
      emptyRowIndex === -1
        ? [...rows, { key: name, value: '' }]
        : rows.map((a, i) => (i === emptyRowIndex ? { ...a, key: name } : a));
    this.attributeBrowser_display = false;
    this.cdr.markForCheck();
  }

  searchItemFiles(event: { query: string }) {
    const q = event.query.toLowerCase();
    this.filteredItemFiles = this.itemFilenames.filter((f) => f.toLowerCase().includes(q));
  }

  submitNewItem() {
    if (!this.newItemNameValid) return;

    const config: Record<string, unknown> = { type: this.newItemType };
    for (const attr of this.newItemAttributes) {
      const key = attr.key.trim();
      if (key !== '') {
        config[key] = attr.value;
      }
    }

    const createdPath = this.newItemFullPath;
    this.newItemError = '';
    // Missing ancestors are auto-created server-side in the same request
    // (create_missing_parents) — one call, and any collision along the
    // chain (which can't be reliably checked client-side, it depends on
    // live Python object introspection) comes back as a normal error on
    // this same request instead of needing separate per-step handling.
    this.createLeafItem(createdPath, config, this.newItemMissingAncestors.length > 0);
  }

  private createLeafItem(
    createdPath: string,
    config: Record<string, unknown>,
    createMissingParents = false,
  ) {
    this.itemsApi
      .createItem(
        createdPath,
        config,
        this.newItemPersist,
        this.newItemFilename || undefined,
        createMissingParents,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.newItem_display = false;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.CREATE_SUCCESS_TITLE'),
            detail: createdPath,
            life: 5000,
          });
          this.getItemtree(createdPath);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.newItemError =
            (err.error?.error as string | undefined) ??
            this.translate.instant('ITEMS.CREATE_FAILED');
          this.cdr.markForCheck();
        },
      });
  }

  /* ----------------------------------------------
   * Edit item attributes
   */

  /** Pre-populates from itemdetails.editable_config — the complete current
   *  attribute set (core + generic), safe to PATCH straight back. NOT from
   *  itemdetails.config, which is item.conf only (generic/plugin attrs) and
   *  silently omits core attributes like type/eval/trigger entirely — using
   *  it here would reset them to their defaults on save. */
  openEditItemDialog() {
    if (!this.itemdetails?.path) return;
    this.activeAttributeDialog = 'edit';
    this.editItemError = '';
    const config = this.itemdetails.editable_config ?? {};
    this.editItemType = (config['type'] as string) ?? this.itemdetails.type ?? 'str';
    this.editItemAttributes = Object.entries(config)
      .filter(([key]) => !ItemTreeComponent.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(key))
      .map(([key, value]) => ({ key, value }));
    this.editItem_display = true;
  }

  addEditAttributeRow() {
    this.editItemAttributes = [...this.editItemAttributes, { key: '', value: '' }];
    setTimeout(() => this.editAttrNameInputs?.last?.nativeElement.querySelector('input')?.focus());
  }

  removeEditAttributeRow(index: number) {
    this.editItemAttributes = this.editItemAttributes.filter((_, i) => i !== index);
  }

  submitEditItem() {
    const config: Record<string, unknown> = { type: this.editItemType };
    for (const attr of this.editItemAttributes) {
      const key = attr.key.trim();
      if (key !== '') {
        config[key] = attr.value;
      }
    }

    const path = this.itemdetails.path;
    this.editItemError = '';
    this.itemsApi
      .editItem(path, config)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editItem_display = false;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.EDIT_SUCCESS_TITLE'),
            detail: path,
            life: 5000,
          });
          this.getDetails(path);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.editItemError =
            (err.error?.error as string | undefined) ?? this.translate.instant('ITEMS.EDIT_FAILED');
          this.cdr.markForCheck();
        },
      });
  }

  /* ----------------------------------------------
   * Rename / move item
   */

  get renameItemNewPath(): string {
    return this.renameItemNewPathInput.trim();
  }

  /** Validates every dot-separated segment, not just the whole string —
   *  catches a stray double-dot or trailing dot from manual typing the
   *  same way an invalid bare leaf name would be caught. */
  get renameItemNewPathValid(): boolean {
    const path = this.renameItemNewPath;
    if (path === '') return false;
    return path.split('.').every((segment) => /^[A-Za-z][A-Za-z0-9_]*$/.test(segment));
  }

  /** Starts at "rename in place" — the input is pre-filled with the item's
   *  complete CURRENT path (not just its leaf name), so the preview
   *  already shows the unchanged path and the parent prefix is genuinely
   *  there to edit, not just implied by the tree selection below. The
   *  tree picker lets the user change the parent too, turning it into a
   *  move (same endpoint either way, see ItemsApiService.renameItem()).
   *  Pre-selects and expands down to the item's current parent in the
   *  picker, so it's clear where it is now, not just where it's going. */
  openRenameItemDialog() {
    if (!this.itemdetails?.path) return;
    const path = this.itemdetails.path;
    const lastDot = path.lastIndexOf('.');
    this.renameItemNewPathInput = path;
    const currentParentPath = lastDot === -1 ? '' : path.slice(0, lastDot);
    this.renameItemSelectedParentNode =
      currentParentPath === ''
        ? undefined
        : (this.findAndExpandNodeByPath(
            this.filteredTree as (TreeNode & { path: string })[],
            currentParentPath,
          ) as TreeNode | undefined);
    this.renameItemError = '';
    this.renameItemMissingAncestors = [];
    this.renameItemSubmitting = false;
    this.renameItem_display = true;
  }

  /** Rewrites just the parent-prefix of renameItemNewPathInput, keeping
   *  whatever leaf segment was already typed — so clicking the tree and
   *  typing a name cooperate on the same field instead of one overwriting
   *  the other. */
  selectRenameParent(event: TreeNodeSelectEvent) {
    const node = event.node as TreeNode & { path: string };
    const current = this.renameItemNewPathInput;
    const lastDot = current.lastIndexOf('.');
    const leaf = lastDot === -1 ? current : current.slice(lastDot + 1);
    this.renameItemNewPathInput = node.path ? node.path + '.' + leaf : leaf;
  }

  submitRenameItem() {
    if (!this.renameItemNewPathValid) return;
    this.renameItemMissingAncestors = [];
    this.attemptRenameItem();
  }

  private attemptRenameItem() {
    const oldPath = this.itemdetails.path;
    const newPath = this.renameItemNewPath;
    this.renameItemError = '';
    this.renameItemSubmitting = true;
    this.itemsApi
      .renameItem(oldPath, newPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.renameItemSubmitting = false;
          this.renameItem_display = false;
          this.renameItemLastFailedReferences = result.failed_references ?? [];
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.RENAME_SUCCESS_TITLE'),
            detail: `${oldPath} -> ${newPath}`,
            life: 5000,
          });
          this.getItemtree(newPath);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.error as string | undefined;
          const missingParent = ItemTreeComponent.MISSING_PARENT_PATTERN.exec(message ?? '');
          if (missingParent) {
            this.checkMissingAncestors(newPath);
            return;
          }
          this.renameItemSubmitting = false;
          if (ItemTreeComponent.CYCLE_PATTERN.test(message ?? '')) {
            this.renameItemError = this.translate.instant('ITEMS.RENAME_CYCLE');
          } else {
            this.renameItemError = message ?? this.translate.instant('ITEMS.RENAME_FAILED');
          }
          this.cdr.markForCheck();
        },
      });
  }

  /** Matches Items.rename_item()'s exact "parent '...' not found" message —
   *  only used to recognize this specific failure, not to extract anything
   *  from it (the chain of missing ancestors is computed separately, since
   *  the backend only reports the immediate parent, not deeper ones). */
  private static readonly MISSING_PARENT_PATTERN = /parent '[^']+' not found/;

  /** Matches Items.rename_item()'s "cannot become a child of itself" message. */
  private static readonly CYCLE_PATTERN = /cannot become a child of itself/;

  /** Walks *path*'s dot-separated ancestor chain (excluding the leaf
   *  itself, which always gets created fresh, never treated as an
   *  "ancestor") and returns the ones not present in *known*, shallow to
   *  deep — the order createItemChain() needs to create them in. */
  private static computeMissingAncestors(path: string, known: Set<string>): string[] {
    const segments = path.split('.');
    segments.pop();
    const missing: string[] = [];
    let current = '';
    for (const segment of segments) {
      current = current ? current + '.' + segment : segment;
      if (!known.has(current)) missing.push(current);
    }
    return missing;
  }

  private checkMissingAncestors(newPath: string) {
    this.itemsApi
      .getItemList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paths) => {
        this.renameItemMissingAncestors = ItemTreeComponent.computeMissingAncestors(
          newPath,
          new Set(paths as string[]),
        );
        this.renameItemSubmitting = false;
        this.renameItemConfirmCreateParents_display = true;
        this.cdr.markForCheck();
      });
  }

  /** Structural-only items (no explicit type — Item.__init__ defaults an
   *  untyped item to type 'foo' itself, see lib/item/item.py) matching the
   *  moved item's own persistence — created in the same file it's already
   *  in, so the whole chain stays consistent once the rename actually
   *  moves it underneath them (see
   *  ~/.claude/handoff/shng-rename-item-design.md's "which file" priority
   *  rule on the backend side). */
  confirmCreateMissingParents() {
    this.renameItemConfirmCreateParents_display = false;
    this.renameItemSubmitting = true;
    const filename = this.itemdetails.filename;
    const persist = !!filename && filename !== 'None';
    this.createItemChain(
      [...this.renameItemMissingAncestors],
      persist,
      persist ? filename : undefined,
      () => this.attemptRenameItem(),
      (err: HttpErrorResponse) => {
        this.renameItemSubmitting = false;
        this.renameItemError =
          (err.error?.error as string | undefined) ?? this.translate.instant('ITEMS.RENAME_FAILED');
        this.cdr.markForCheck();
      },
    );
  }

  /** Creates each path in *remaining*, in order (shallow to deep), as an
   *  empty structural item — used both by rename's missing-ancestor
   *  recovery and by create-item's up-front path auto-vivification. No
   *  rollback on a mid-chain failure: whatever was already created stays
   *  (they're valid, harmless structural items either way — same as if a
   *  user had created them by hand ahead of time). */
  private createItemChain(
    remaining: string[],
    persist: boolean,
    filename: string | undefined,
    onDone: () => void,
    onError: (err: HttpErrorResponse) => void,
  ) {
    if (remaining.length === 0) {
      onDone();
      return;
    }
    const [next, ...rest] = remaining;
    this.itemsApi
      .createItem(next, {}, persist, filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.createItemChain(rest, persist, filename, onDone, onError),
        error: onError,
      });
  }

  /* ----------------------------------------------
   * Delete item
   */

  openDeleteItemDialog() {
    if (!this.itemdetails?.path) return;
    this.deleteItemError = '';
    this.deleteItemReferences = null;
    this.deleteItemReferencesFailed = false;
    this.deleteItemCleanupReferences = true;
    this.deleteItemCleanupFailed = false;
    this.deleteItemPersist = this.deleteItemHasFile;
    this.deleteItemConfirmChildren = false;
    this.deleteItem_display = true;

    this.itemsApi
      .getItemReferences(this.itemdetails.path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((refs) => {
        if (refs === null) {
          this.deleteItemReferencesFailed = true;
        } else {
          this.deleteItemReferences = this.sortReferencesForReview(refs);
        }
        this.cdr.markForCheck();
      });
  }

  confirmDeleteItem() {
    const path = this.itemdetails.path;
    this.deleteItemCleanupFailed = false;

    const hasCleanableReferences = (this.deleteItemReferences ?? []).some((ref) => ref.unambiguous);
    if (this.deleteItemCleanupReferences && hasCleanableReferences) {
      this.itemsApi
        .removeReferences(path)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.performDelete(path),
          error: () => {
            // A hard failure of the cleanup call itself (network/500) — not
            // the normal best-effort outcome (skipped_ambiguous), which is
            // already known from the review table above and isn't an error.
            // Abort rather than delete an item whose references we just
            // failed to clean up, leaving the user able to retry or
            // uncheck cleanup and delete without it.
            this.deleteItemCleanupFailed = true;
            this.cdr.markForCheck();
          },
        });
    } else {
      this.performDelete(path);
    }
  }

  private performDelete(path: string) {
    this.itemsApi
      .deleteItem(
        path,
        this.deleteItemPersist,
        this.deleteItemHasChildren && this.deleteItemConfirmChildren,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteItem_display = false;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.DELETE_SUCCESS_TITLE'),
            detail: path,
            life: 5000,
          });
          this.showDetails();
          this.getItemtree();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.deleteItemError =
            (err.error?.error as string | undefined) ??
            this.translate.instant('ITEMS.DELETE_FAILED');
          this.cdr.markForCheck();
        },
      });
  }
}

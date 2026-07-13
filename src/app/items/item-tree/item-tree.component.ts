import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChildren,
} from '@angular/core';
import { AppConfigService } from '../../common/services/app-config.service';
import { AttributeValueInputComponent } from '../attribute-value-input/attribute-value-input.component';

import { TranslateDirective, TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  faCircleNotch,
  faEllipsisVertical,
  faFolder,
  faFolderOpen,
  faList,
  faPlus,
  faSearch,
  faStop,
  faSync,
  faThumbtack,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

import { MenuItem, MessageService, PrimeTemplate, SelectItem, TreeNode } from 'primeng/api';
import { TreeNodeSelectEvent } from 'primeng/tree';

import { HttpErrorResponse } from '@angular/common/http';
import { ItemAttributeInfo } from '../../common/models/item-attribute-info';
import {
  ItemReferenceLeftPointingAtOriginal,
  ItemRelativeReferenceFlagged,
} from '../../common/models/item-copy-result';
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
import { Menu } from 'primeng/menu';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Ripple } from 'primeng/ripple';
import { Select } from 'primeng/select';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { Tree } from 'primeng/tree';
import { forkJoin } from 'rxjs';
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
    Menu,
  ],
})
export class ItemTreeComponent implements OnDestroy, OnInit {
  private readonly attrNameInputs = viewChildren('attrNameInput', { read: ElementRef });
  /** Separate from attrNameInputs — PrimeNG dialogs may keep their content
   *  mounted (just hidden) while closed, so a shared ref name across both
   *  dialogs' row loops could mix rows from both into one QueryList. */
  private readonly editAttrNameInputs = viewChildren('editAttrNameInput', { read: ElementRef });

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
  faEllipsisVertical = faEllipsisVertical;

  readonly itemcount = signal(0);
  itemtree!: ItemTree;
  readonly itemdetails = signal<ItemDetails>(<ItemDetails>{});
  readonly itemdetailsloaded = signal(false);

  /** Core + plugin item attributes, keyed by name, loaded from the backend
   *  (items/attributes and plugins/info) and offered as autocomplete suggestions
   *  when adding free-text attributes to a new item. Also the source for the
   *  "type" field's value list and for attribute hint text. */
  readonly attributeCatalog = signal<Record<string, AttributeCatalogEntry>>({});
  readonly attributeCatalogLoaded = signal(false);
  /** Same data as attributeCatalog, pre-grouped by source ('core' first, then
   *  plugins alphabetically) for the attribute browser dialog. */
  readonly attributeGroups = signal<AttributeGroup[]>([]);

  readonly attributeBrowser_display = signal(false);
  attributeBrowserSearch = '';

  get itemTypeOptions(): SelectItem[] {
    const validList = this.attributeCatalog()['type']?.valid_list ?? [];
    return validList.map((t) => ({ label: t, value: t }));
  }

  /** name/type have their own dedicated dialog fields, so they're excluded from
   *  the free-text attribute autocomplete suggestions. */
  private static readonly ATTRIBUTES_WITH_DEDICATED_FIELDS = ['name', 'type'];

  readonly newItem_display = signal(false);
  newItemParent = '';
  newItemName = '';
  newItemType = 'str';
  newItemPersist = true;
  newItemFilename = '';
  newItemAttributes: { key: string; value: unknown }[] = [];
  filteredAttributeNames: string[] = [];
  itemFilenames: string[] = [];
  filteredItemFiles: string[] = [];
  readonly newItemError = signal('');

  readonly editItem_display = signal(false);
  editItemType = 'str';
  editItemAttributes: { key: string; value: unknown }[] = [];
  readonly editItemError = signal('');

  readonly renameItem_display = signal(false);
  /** Single field, doing double duty: a bare name ("switch") renames in
   *  place under whatever parent is currently selected in the tree below;
   *  a dotted path ("a.b.switch") is used as the complete new path as-is,
   *  for power users who'd rather type than click through the tree.
   *  Clicking a tree node rewrites just this string's parent-prefix,
   *  keeping whatever leaf segment was already typed — the two input
   *  methods cooperate on the same field rather than fighting over it. */
  renameItemNewPathInput = '';
  renameItemSelectedParentNode: TreeNode | undefined;
  /** Same dialog serves both rename/move and copy — a plain boolean (not a
   *  signal), like the sibling newItemPersist field, bound via [(ngModel)]
   *  on the toggle switch. True routes submitRenameItem() to
   *  attemptCopyItem() instead of attemptRenameItem() and leaves the
   *  original item untouched. */
  renameItemIsCopy = false;
  /** Only meaningful while renameItemIsCopy is true — whether the copy
   *  includes the item's child items (the whole subtree, the default) or
   *  just the item's own attributes. Passed straight through to
   *  Items.copy_item()'s include_children parameter. */
  renameItemCopyIncludeChildren = true;
  readonly renameItemError = signal('');
  /** True while a rename/create-missing-parent request is in flight —
   *  renaming can take a while if a plugin pauses to reconnect to real
   *  hardware/network, and with no other feedback users have been known
   *  to assume it's stuck and try to cancel. */
  readonly renameItemSubmitting = signal(false);
  /** Set after a successful rename/move that left some references
   *  un-rewritten — the detail dialog auto-opens right away (see
   *  attemptRenameItem()) rather than waiting behind a badge no one's
   *  guaranteed to click. Dismissing that dialog clears this too (see
   *  dismissRenameFailedReferences()) — relying on "the next rename" to
   *  clear a stale notice isn't realistic if the user has nothing else to
   *  rename any time soon. */
  readonly renameItemLastFailedReferences = signal<[string, string][]>([]);
  renameFailedReferencesDetail_display = false;

  /** Bound to the dialog's (visibleChange) (X button/ESC/outside click) AND
   *  called directly by the footer Close button — either way, closing the
   *  dialog is treated as "acknowledged", clearing the underlying list so
   *  the badge doesn't linger with no dismiss action of its own. */
  onRenameFailedReferencesVisibleChange(visible: boolean) {
    this.renameFailedReferencesDetail_display = visible;
    if (!visible) {
      this.renameItemLastFailedReferences.set([]);
    }
  }

  /** Set after a copy that left some self-references pointing at the
   *  original (include_children=False left their target behind, or they
   *  pointed outside the copied subtree entirely) or flagged a relative
   *  reference that may no longer be correct. Same auto-open/dismiss-to-clear
   *  treatment as renameItemLastFailedReferences, see attemptCopyItem() /
   *  dismissCopyReferences(). */
  readonly copyItemLeftPointingAtOriginal = signal<ItemReferenceLeftPointingAtOriginal[]>([]);
  readonly copyItemRelativeReferencesFlagged = signal<ItemRelativeReferenceFlagged[]>([]);
  copyReferencesDetail_display = false;

  get copyReferencesTotalCount(): number {
    return (
      this.copyItemLeftPointingAtOriginal().length + this.copyItemRelativeReferencesFlagged().length
    );
  }

  /** Same treatment as onRenameFailedReferencesVisibleChange() — bound to
   *  (visibleChange) and called directly by the footer Close button. */
  onCopyReferencesVisibleChange(visible: boolean) {
    this.copyReferencesDetail_display = visible;
    if (!visible) {
      this.copyItemLeftPointingAtOriginal.set([]);
      this.copyItemRelativeReferencesFlagged.set([]);
    }
  }

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
      ...(this.filteredTree() ?? []),
    ];
  }

  /** Set when a rename attempt fails specifically because the target's
   *  parent doesn't exist yet — offered to the user as "create these
   *  first?" rather than just a dead-end error. */
  readonly renameItemMissingAncestors = signal<string[]>([]);
  readonly renameItemConfirmCreateParents_display = signal(false);

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

  readonly deleteItem_display = signal(false);
  readonly deleteItemReferences = signal<ItemReference[] | null>(null);
  readonly deleteItemReferencesFailed = signal(false);
  readonly deleteItemError = signal('');
  deleteItemPersist = true;
  deleteItemCleanupReferences = true;
  readonly deleteItemCleanupFailed = signal(false);
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

  selectedNode: unknown;

  readonly update_age = signal('');
  readonly change_age = signal('');
  readonly previous_update_age = signal('');
  readonly previous_change_age = signal('');

  data: unknown;

  private readonly destroyRef = inject(DestroyRef);
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
        this.attributeCatalog.set(catalog);
        this.attributeGroups.set(this.buildAttributeGroups(catalog));
        this.attributeCatalogLoaded.set(true);
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
    const description = this.attributeCatalog()[key]?.description;
    if (!description) return '';
    const lang = this.translate.currentLang as 'de' | 'en';
    return description[lang] ?? description.en ?? description.de ?? '';
  }

  /** Declared type for the attribute-value-input control — '' (its default,
   *  plain text) for an attribute name not yet chosen or not in the catalog
   *  (e.g. a still-unknown plugin attribute). */
  attributeType(key: string): string {
    return this.attributeCatalog()[key]?.type ?? '';
  }

  attributeValidList(key: string): string[] | undefined {
    return this.attributeCatalog()[key]?.valid_list;
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
    const node = this.findAndExpandNodeByPath(
      this.filteredTree() as (TreeNode & { path: string })[],
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
    this.data = data;
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

  /** False for purely runtime items (never persisted to a file) — the backend
   *  returns the literal string 'None' for those, same as openNewItemDialog()'s
   *  parent-filename check below. The delete dialog's persist toggle is
   *  meaningless for these (nothing to remove from a file), so it gets
   *  disabled rather than offering a choice that has no effect either way. */
  get deleteItemHasFile(): boolean {
    const filename = this.itemdetails().filename;
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
    return ItemTreeComponent.computeMissingAncestors(
      this.newItemFullPath,
      this.newItemKnownPaths(),
    );
  }

  private readonly newItemKnownPaths = signal(new Set<string>());

  openNewItemDialog() {
    this.activeAttributeDialog = 'create';
    const details = this.itemdetails();
    this.newItemParent = details?.path ?? '';
    this.newItemName = '';
    this.newItemType = 'str';
    this.newItemPersist = true;
    // Overwritable default: the parent's own file, so the new item stays next
    // to related config. Empty (top-level, no parent) falls through to the
    // backend's own default (sh._created_items_file) when persisting.
    const parentFilename = details?.filename;
    this.newItemFilename = parentFilename && parentFilename !== 'None' ? parentFilename : '';
    this.newItemAttributes = [];
    this.newItemError.set('');
    this.newItem_display.set(true);

    this.itemsApi
      .getItemList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paths) => {
        this.newItemKnownPaths.set(new Set(paths as string[]));
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
    setTimeout(() => this.attrNameInputs()?.at(-1)!?.nativeElement.querySelector('input')?.focus());
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
    this.filteredAttributeNames = Object.keys(this.attributeCatalog()).filter(
      (a) =>
        a.toLowerCase().includes(q) &&
        !used.includes(a) &&
        !ItemTreeComponent.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(a),
    );
  }

  get filteredAttributeGroups(): AttributeGroup[] {
    const q = this.attributeBrowserSearch.toLowerCase();
    const used = this.activeAttributeRows.map((a) => a.key);
    return this.attributeGroups()
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
    this.attributeBrowser_display.set(true);
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
    this.attributeBrowser_display.set(false);
  }

  searchItemFiles(event: { query: string }) {
    const q = event.query.toLowerCase();
    this.filteredItemFiles = this.itemFilenames.filter((f) => f.toLowerCase().includes(q));
  }

  /** Filenames are stored/matched without extension (see itemFilenames above
   *  and lib/shyaml.py's yamlfile docstring) — typing "orbtest.yaml" or
   *  "orbtest.yml" instead of picking the extension-less suggestion used to
   *  make the backend treat it as a different file from the existing
   *  "orbtest", silently overwriting it (its own existence check appends
   *  ".yaml" unconditionally, unlike the load/save helpers). Stripped on
   *  blur so the field always shows what will actually be used. */
  stripFilenameExtension() {
    this.newItemFilename = this.newItemFilename.replace(/\.ya?ml$/i, '');
  }

  submitNewItem() {
    if (!this.newItemNameValid) return;
    this.stripFilenameExtension();

    const config: Record<string, unknown> = { type: this.newItemType };
    for (const attr of this.newItemAttributes) {
      const key = attr.key.trim();
      if (key !== '') {
        config[key] = attr.value;
      }
    }

    const createdPath = this.newItemFullPath;
    this.newItemError.set('');
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
          this.newItem_display.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.CREATE_SUCCESS_TITLE'),
            detail: createdPath,
            life: 5000,
          });
          this.getItemtree(createdPath);
        },
        error: (err: HttpErrorResponse) => {
          this.newItemError.set(
            (err.error?.error as string | undefined) ??
              this.translate.instant('ITEMS.CREATE_FAILED'),
          );
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
    const details = this.itemdetails();
    if (!details?.path) return;
    this.activeAttributeDialog = 'edit';
    this.editItemError.set('');
    const config = details.editable_config ?? {};
    this.editItemType = (config['type'] as string) ?? details.type ?? 'str';
    this.editItemAttributes = Object.entries(config)
      .filter(([key]) => !ItemTreeComponent.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(key))
      .map(([key, value]) => ({ key, value }));
    this.editItem_display.set(true);
  }

  addEditAttributeRow() {
    this.editItemAttributes = [...this.editItemAttributes, { key: '', value: '' }];
    setTimeout(() =>
      this.editAttrNameInputs()?.at(-1)!?.nativeElement.querySelector('input')?.focus(),
    );
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

    const path = this.itemdetails().path;
    this.editItemError.set('');
    this.itemsApi
      .editItem(path, config)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editItem_display.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.EDIT_SUCCESS_TITLE'),
            detail: path,
            life: 5000,
          });
          this.getDetails(path);
        },
        error: (err: HttpErrorResponse) => {
          this.editItemError.set(
            (err.error?.error as string | undefined) ?? this.translate.instant('ITEMS.EDIT_FAILED'),
          );
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
    if (this.renameItemIsCopy && (path === this.itemdetails().path || this.renameItemCopyDisabled))
      return false;
    return path.split('.').every((segment) => /^[A-Za-z][A-Za-z0-9_]*$/.test(segment));
  }

  /** Only a persisted item's complete config can be reconstructed with its
   *  children intact (see Items.copy_item()'s docstring on the backend) — a
   *  runtime-only item has no such helper, so copying it is disabled here
   *  rather than failing after a round-trip to the server. */
  get renameItemCopyDisabled(): boolean {
    const filename = this.itemdetails().filename;
    return !filename || filename === 'None';
  }

  /** Starts at "rename in place" — the input is pre-filled with the item's
   *  complete CURRENT path (not just its leaf name), so the preview
   *  already shows the unchanged path and the parent prefix is genuinely
   *  there to edit, not just implied by the tree selection below. The
   *  tree picker lets the user change the parent too, turning it into a
   *  move (same endpoint either way, see ItemsApiService.renameItem()).
   *  Pre-selects and expands down to the item's current parent in the
   *  picker, so it's clear where it is now, not just where it's going. */
  openRenameItemDialog(isCopy = false) {
    const path = this.itemdetails()?.path;
    if (!path) return;
    const lastDot = path.lastIndexOf('.');
    this.renameItemNewPathInput = path;
    const currentParentPath = lastDot === -1 ? '' : path.slice(0, lastDot);
    this.renameItemSelectedParentNode =
      currentParentPath === ''
        ? undefined
        : (this.findAndExpandNodeByPath(
            this.filteredTree() as (TreeNode & { path: string })[],
            currentParentPath,
          ) as TreeNode | undefined);
    this.renameItemError.set('');
    this.renameItemMissingAncestors.set([]);
    this.renameItemSubmitting.set(false);
    // Deliberately NOT stomped to false when renameItemCopyDisabled — opening
    // straight into "Kopieren" with the reason explained inline communicates
    // why, instead of silently landing on "Rename" and leaving the user to
    // wonder what happened to the action they picked. isCopy itself is only
    // ever set here, by which menu action opened the dialog (Rename vs Copy)
    // — no in-dialog switch to flip between the two anymore.
    this.renameItemIsCopy = isCopy;
    this.renameItemCopyIncludeChildren = true;
    this.renameItem_display.set(true);
  }

  openCopyItemDialog() {
    this.openRenameItemDialog(true);
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
        command: () => this.openEditItemDialog(),
      },
      {
        label: this.translate.instant('BUTTON.RENAME'),
        icon: 'pi pi-arrow-right-arrow-left',
        command: () => this.openRenameItemDialog(),
      },
      {
        label: this.translate.instant('BUTTON.COPY'),
        icon: 'pi pi-copy',
        command: () => this.openCopyItemDialog(),
      },
      { separator: true },
      {
        label: this.translate.instant('BUTTON.DELETE'),
        icon: 'pi pi-trash',
        styleClass: 'menu-item-danger',
        command: () => this.openDeleteItemDialog(),
      },
    ];
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
    this.renameItemMissingAncestors.set([]);
    if (this.renameItemIsCopy) {
      this.attemptCopyItem();
    } else {
      this.attemptRenameItem();
    }
  }

  private attemptRenameItem() {
    const oldPath = this.itemdetails().path;
    const newPath = this.renameItemNewPath;
    this.renameItemError.set('');
    this.renameItemSubmitting.set(true);
    this.itemsApi
      .renameItem(oldPath, newPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.renameItemSubmitting.set(false);
          this.renameItem_display.set(false);
          this.renameItemLastFailedReferences.set(result.failed_references ?? []);
          this.renameFailedReferencesDetail_display =
            this.renameItemLastFailedReferences().length > 0;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.RENAME_SUCCESS_TITLE'),
            detail: `${oldPath} -> ${newPath}`,
            life: 5000,
          });
          this.getItemtree(newPath);
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.error as string | undefined;
          const missingParent = ItemTreeComponent.MISSING_PARENT_PATTERN.exec(message ?? '');
          if (missingParent) {
            this.checkMissingAncestors(newPath);
            return;
          }
          this.renameItemSubmitting.set(false);
          if (ItemTreeComponent.CYCLE_PATTERN.test(message ?? '')) {
            this.renameItemError.set(this.translate.instant('ITEMS.RENAME_CYCLE'));
          } else {
            this.renameItemError.set(message ?? this.translate.instant('ITEMS.RENAME_FAILED'));
          }
        },
      });
  }

  /** Mirrors attemptRenameItem() but calls copyItem() and leaves the
   *  source item untouched — same missing-ancestor recovery path, since
   *  Items.copy_item() reuses create_item()'s own "parent not found"
   *  error. */
  private attemptCopyItem() {
    const oldPath = this.itemdetails().path;
    const newPath = this.renameItemNewPath;
    this.renameItemError.set('');
    this.renameItemSubmitting.set(true);
    this.itemsApi
      .copyItem(oldPath, newPath, undefined, this.renameItemCopyIncludeChildren)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.renameItemSubmitting.set(false);
          this.renameItem_display.set(false);
          this.copyItemLeftPointingAtOriginal.set(result.left_pointing_at_original ?? []);
          this.copyItemRelativeReferencesFlagged.set(result.relative_references_flagged ?? []);
          this.copyReferencesDetail_display = this.copyReferencesTotalCount > 0;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.COPY_SUCCESS_TITLE'),
            detail: `${oldPath} -> ${newPath}`,
            life: 5000,
          });
          this.getItemtree(newPath);
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.error as string | undefined;
          const missingParent = ItemTreeComponent.MISSING_PARENT_PATTERN.exec(message ?? '');
          if (missingParent) {
            this.checkMissingAncestors(newPath);
            return;
          }
          this.renameItemSubmitting.set(false);
          this.renameItemError.set(message ?? this.translate.instant('ITEMS.COPY_FAILED'));
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
        this.renameItemMissingAncestors.set(
          ItemTreeComponent.computeMissingAncestors(newPath, new Set(paths as string[])),
        );
        this.renameItemSubmitting.set(false);
        this.renameItemConfirmCreateParents_display.set(true);
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
    this.renameItemConfirmCreateParents_display.set(false);
    this.renameItemSubmitting.set(true);
    const filename = this.itemdetails().filename;
    const persist = !!filename && filename !== 'None';
    const isCopy = this.renameItemIsCopy;
    this.createItemChain(
      [...this.renameItemMissingAncestors()],
      persist,
      persist ? filename : undefined,
      () => (isCopy ? this.attemptCopyItem() : this.attemptRenameItem()),
      (err: HttpErrorResponse) => {
        this.renameItemSubmitting.set(false);
        this.renameItemError.set(
          (err.error?.error as string | undefined) ??
            this.translate.instant(isCopy ? 'ITEMS.COPY_FAILED' : 'ITEMS.RENAME_FAILED'),
        );
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
    const path = this.itemdetails()?.path;
    if (!path) return;
    this.deleteItemError.set('');
    this.deleteItemReferences.set(null);
    this.deleteItemReferencesFailed.set(false);
    this.deleteItemCleanupReferences = true;
    this.deleteItemCleanupFailed.set(false);
    this.deleteItemPersist = this.deleteItemHasFile;
    this.deleteItemConfirmChildren = false;
    this.deleteItem_display.set(true);

    this.itemsApi
      .getItemReferences(path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((refs) => {
        if (refs === null) {
          this.deleteItemReferencesFailed.set(true);
        } else {
          this.deleteItemReferences.set(this.sortReferencesForReview(refs));
        }
      });
  }

  confirmDeleteItem() {
    const path = this.itemdetails().path;
    this.deleteItemCleanupFailed.set(false);

    const hasCleanableReferences = (this.deleteItemReferences() ?? []).some(
      (ref) => ref.unambiguous,
    );
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
            this.deleteItemCleanupFailed.set(true);
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
          this.deleteItem_display.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('ITEMS.DELETE_SUCCESS_TITLE'),
            detail: path,
            life: 5000,
          });
          this.showDetails();
          this.getItemtree();
        },
        error: (err: HttpErrorResponse) => {
          this.deleteItemError.set(
            (err.error?.error as string | undefined) ??
              this.translate.instant('ITEMS.DELETE_FAILED'),
          );
        },
      });
  }
}

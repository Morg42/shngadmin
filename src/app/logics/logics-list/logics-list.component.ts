import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, merge, of } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';

import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Ripple } from 'primeng/ripple';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { LogicsGroupType, LogicsinfoType } from '../../common/models/logics-info';
import { LogicsWatchItem } from '../../common/models/logics-watch-item';
import { LogicsApiService } from '../../common/services/logics-api.service';

interface LogicsResponse {
  groups: Record<string, Record<string, string>>;
  unknown_groups?: Record<string, string[]>;
  logics: LogicsinfoType[];
  logics_new: LogicsinfoType[];
}

@Component({
  selector: 'app-logics',
  templateUrl: './logics-list.component.html',
  styleUrls: ['./logics-list.component.css'],
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Tabs,
    TabList,
    Ripple,
    Tab,
    TabPanels,
    TabPanel,
    ButtonDirective,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
    RouterLink,
    Dialog,
    PrimeTemplate,
    FormsModule,
    InputText,
    NgStyle,
    Message,
    ToggleSwitch,
    TranslatePipe,
  ],
})
export class LogicsListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private dataService = inject(LogicsApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private titleService = inject(Title);

  /** Emits to re-fetch the logics list (after every state-changing action). */
  private readonly refresh$ = new Subject<void>();

  /** Fetches once on construction and again on every refresh$ emission.
   *  The tap preserves the legacy default: when no logic is in any group and
   *  the user has no stored preference, start in the ungrouped view. */
  private readonly logicsResponse = toSignal(
    merge(of(undefined), this.refresh$).pipe(
      switchMap(() => this.dataService.getLogics()),
      filter((r): r is LogicsResponse => !!r && typeof r === 'object' && 'logics' in r),
      tap((resp) => {
        const anyGroup = resp.logics.some(
          (l) =>
            l.userlogic === true &&
            l.group != null &&
            (Array.isArray(l.group) ? l.group.some((g) => g !== '') : l.group !== ''),
        );
        if (!anyGroup && localStorage.getItem('shng.logics.grouped') === null) {
          this._grouped = false;
        }
      }),
    ),
    { initialValue: null },
  );

  readonly groupdefinitions = computed(() => this.logicsResponse()?.groups ?? {});

  private readonly unknownGroupNames = computed(
    () => new Set(Object.keys(this.logicsResponse()?.unknown_groups ?? {})),
  );

  /** All logics, name-sorted; user logics get their group normalized to ['']
   *  when empty (the template renders per-group membership from it). */
  readonly logics = computed<LogicsinfoType[]>(() => {
    const resp = this.logicsResponse();
    if (!resp) {
      return [];
    }
    return resp.logics
      .map((l) =>
        l.userlogic === true && (l.group == null || l.group.length === 0)
          ? { ...l, group: [''] }
          : l,
      )
      .sort((a, b) =>
        a.name.toLowerCase() > b.name.toLowerCase()
          ? 1
          : b.name.toLowerCase() > a.name.toLowerCase()
            ? -1
            : 0,
      );
  });

  readonly uSortField = signal('');
  readonly uSortOrder = signal<1 | -1>(1);
  readonly sSortField = signal('');
  readonly sSortOrder = signal<1 | -1>(1);

  readonly userlogics = computed(() =>
    this.sortByField(
      this.logics().filter((l) => l.userlogic === true),
      this.uSortField(),
      this.uSortOrder(),
    ),
  );

  readonly systemlogics = computed(() =>
    this.sortByField(
      this.logics().filter((l) => l.userlogic !== true),
      this.sSortField(),
      this.sSortOrder(),
    ),
  );

  readonly newlogics = computed<LogicsinfoType[]>(() => {
    const resp = this.logicsResponse();
    if (!resp) {
      return [];
    }
    return [...resp.logics_new].sort((a, b) =>
      a.name.toLowerCase() > b.name.toLowerCase()
        ? 1
        : b.name.toLowerCase() > a.name.toLowerCase()
          ? -1
          : 0,
    );
  });

  /** All group names occurring on user logics, enriched with title and
   *  description from logic_groups.yaml, alphabetical with the unnamed
   *  ('no group') entry moved to the end. */
  readonly groupList = computed<LogicsGroupType[]>(() => {
    const defs = this.groupdefinitions();
    const unknown = this.unknownGroupNames();
    const groups: LogicsGroupType[] = [];
    for (const logic of this.userlogics()) {
      const names = Array.isArray(logic.group) ? logic.group : [logic.group ?? ''];
      for (const name of names) {
        if (groups.find((g) => g.name === name) === undefined) {
          groups.push({
            name,
            title: defs[name]?.['title'] ?? '',
            description: defs[name]?.['description'] ?? '',
            unknown: name !== '' && unknown.has(name),
          });
        }
      }
    }
    groups.sort((a, b) =>
      (a.name ?? '').toLowerCase() > (b.name ?? '').toLowerCase()
        ? 1
        : (b.name ?? '').toLowerCase() > (a.name ?? '').toLowerCase()
          ? -1
          : 0,
    );
    if (groups.length > 0 && groups[0].name === '') {
      groups.push(groups[0]);
      groups.shift();
    }
    return groups;
  });

  readonly nogroups = computed(() => !this.groupList().some((g) => g.name !== ''));

  readonly filterText = signal('');

  readonly filteredUserLogics = computed(() => this.filterLogics(this.userlogics()));
  readonly filteredSysLogics = computed(() => this.filterLogics(this.systemlogics()));

  private _grouped = true;
  get grouped(): boolean {
    return this._grouped;
  }
  set grouped(val: boolean) {
    this._grouped = val;
    localStorage.setItem('shng.logics.grouped', String(val));
  }
  activeTabIndex = '0';

  groupExpanded: number[] = [];

  showLogicDetails = false;
  selectedLogicWatchItems: LogicsWatchItem[] = [];

  newlogic_display: boolean = false;
  newlogic_name: string = '';
  newlogic_filename: string = '';
  newlogic_add_enabled: boolean = true;
  wrongNewLogicName: string = '';
  confirmdelete_display: boolean = false;
  logicToDelete: string = '';
  delete_param!: {};

  readonly rename_display = signal(false);
  rename_oldLogicName = '';
  rename_newLogicName = '';
  rename_newFilename = '';
  rename_currentFilename = '';

  ngOnInit() {
    this.groupExpanded = this.dataService.groupExpanded;

    // Restore persisted grouped preference; default true when groups exist
    const stored = localStorage.getItem('shng.logics.grouped');
    this._grouped = stored !== null ? stored === 'true' : true;

    this.titleService.setTitle(this.translate.instant('MENU.LOGICS'));
  }

  private sortByField(list: LogicsinfoType[], field: string, ord: 1 | -1): LogicsinfoType[] {
    if (!field) {
      return list;
    }
    return [...list].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      return av < bv ? -ord : av > bv ? ord : 0;
    });
  }

  private filterLogics(list: LogicsinfoType[]): LogicsinfoType[] {
    const f = this.filterText().toLowerCase();
    if (!f) {
      return list;
    }
    return list.filter(
      (l) => l.name.toLowerCase().includes(f) || (l.filename ?? '').toLowerCase().includes(f),
    );
  }

  onFilterChange(value: string): void {
    this.filterText.set(value);
  }

  clearFilter(): void {
    this.filterText.set('');
  }

  /** Returns a comma-separated list of non-empty group names for display in the flat table. */
  groupLabel(logic: LogicsinfoType): string {
    if (!logic.group) return '';
    const groups = Array.isArray(logic.group) ? logic.group : [logic.group];
    return groups.filter((g) => g !== '').join(', ');
  }

  /** Returns true if any of the logic's groups are not defined in logic_groups.yaml. */
  hasUnknownGroup(logic: LogicsinfoType): boolean {
    if (!logic.group) return false;
    const groups = Array.isArray(logic.group) ? logic.group : [logic.group];
    return groups.some((g) => g !== '' && this.unknownGroupNames().has(g));
  }

  /** Returns the non-empty group names of a logic as an array (for flat-list rendering). */
  getGroupsArray(logic: LogicsinfoType): string[] {
    if (!logic.group) return [];
    const groups = Array.isArray(logic.group) ? logic.group : [logic.group];
    return groups.filter((g) => g !== '');
  }

  /** Returns true if the given group name is not defined in logic_groups.yaml. */
  isUnknownGroup(groupname: string): boolean {
    return this.unknownGroupNames().has(groupname);
  }

  /** When a filter is active, expand all accordion panels so no match is hidden. */
  get effectiveExpanded(): number[] {
    if (this.filterText()) {
      return this.groupList().map((_, i) => i);
    }
    return this.groupExpanded;
  }

  sortUserLogics(field: string): void {
    this.uSortOrder.set(this.uSortField() === field ? (this.uSortOrder() === 1 ? -1 : 1) : 1);
    this.uSortField.set(field);
  }

  sortSysLogics(field: string): void {
    this.sSortOrder.set(this.sSortField() === field ? (this.sSortOrder() === 1 ? -1 : 1) : 1);
    this.sSortField.set(field);
  }

  baseName(str: string, withExtension = true) {
    let base = str;
    base = base.substring(base.lastIndexOf('/') + 1);
    if (!withExtension && base.lastIndexOf('.') !== -1) {
      base = base.substring(0, base.lastIndexOf('.'));
    }
    return base;
  }

  groupOpened(event: { index: number }) {
    const index = event['index'];
    if (this.groupExpanded.indexOf(index) === -1) {
      this.groupExpanded.push(index);
      this.dataService.groupExpanded = this.groupExpanded;
    }
  }

  groupClosed(event: { index: number }) {
    const index = event['index'];
    if (this.groupExpanded.indexOf(index) > -1) {
      this.groupExpanded.splice(this.groupExpanded.indexOf(index), 1);
      this.dataService.groupExpanded = this.groupExpanded;
    }
  }

  private refreshLogics() {
    this.refresh$.next();
  }

  triggerLogic(logicName: string) {
    this.dataService
      .setLogicState(logicName, 'trigger')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLogics();
      });
  }

  disableLogic(logicName: string) {
    this.dataService
      .setLogicState(logicName, 'disable')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLogics();
      });
  }

  enableLogic(logicName: string) {
    this.dataService
      .setLogicState(logicName, 'enable')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLogics();
      });
  }

  unloadLogic(logicName: string) {
    this.dataService
      .setLogicState(logicName, 'unload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLogics();
      });
  }

  reloadLogic(logicName: string) {
    this.dataService
      .setLogicState(logicName, 'reload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLogics();
      });
  }

  loadLogic(logicName: string) {
    this.dataService
      .setLogicState(logicName, 'load')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLogics();
      });
  }

  newLogic() {
    this.newlogic_name = '';
    this.newlogic_filename = '';
    this.newlogic_add_enabled = false;

    this.newlogic_display = true;
  }

  onShow() {}

  onBlur() {}

  onFocus() {
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

    const logics = this.logics();
    for (let i = 0; i < logics.length; i++) {
      if (this.newlogic_name === logics[i].name) {
        this.newlogic_add_enabled = false;
        this.wrongNewLogicName = 'LOGICS.NAME_ALREADY_EXISTS';
        return;
      }
    }

    for (let i = 0; i < logics.length; i++) {
      if (this.newlogic_filename === this.baseName(logics[i].pathname, false)) {
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
    this.newlogic_display = false;
    this.dataService
      .setLogicState(this.newlogic_name, 'create', this.newlogic_filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLogics();
        this.router.navigate(['/logics/edit', this.newlogic_name]);
      });
  }

  deleteLogic(logicName: string, fileName: string) {
    this.logicToDelete = logicName;
    this.delete_param = { config: logicName, filename: fileName };
    this.confirmdelete_display = true;
  }

  deleteLogicConfirm(with_code: boolean) {
    this.confirmdelete_display = false;

    let action = 'delete';
    if (with_code === true) {
      action = 'delete_with_code';
    }

    this.dataService
      .setLogicState(this.logicToDelete, action)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshLogics();
      });
  }

  deleteLogicAbort() {
    this.confirmdelete_display = false;
    this.logicToDelete = '';
  }

  openRenameDialog(logicName: string, filename: string) {
    this.rename_oldLogicName = logicName;
    this.rename_newLogicName = logicName;
    this.rename_currentFilename = filename.endsWith('.py') ? filename.slice(0, -3) : filename;
    this.rename_newFilename = this.rename_currentFilename;
    this.rename_display.set(true);
  }

  get renameEnabled(): boolean {
    const nameChanged = this.rename_newLogicName.trim() !== this.rename_oldLogicName;
    const fileChanged = this.rename_newFilename.trim() !== this.rename_currentFilename;
    return (
      this.rename_newLogicName.trim() !== '' &&
      this.rename_newFilename.trim() !== '' &&
      (nameChanged || fileChanged)
    );
  }

  /** True when the filename field changed but only in case — the backend will normalise it to the same lowercase value. */
  get filenameChangeIsNoop(): boolean {
    const newFile = this.rename_newFilename.trim();
    return (
      newFile !== this.rename_currentFilename &&
      newFile.toLowerCase() === this.rename_currentFilename.toLowerCase()
    );
  }

  doRename() {
    const newName = this.rename_newLogicName.trim();
    const newFile = this.rename_newFilename.trim();
    const newFilenameArg = newFile !== this.rename_currentFilename ? newFile : '';
    this.dataService
      .renameLogic(this.rename_oldLogicName, newName, newFilenameArg)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result === true) {
          this.rename_display.set(false);
          this.refreshLogics();
        }
      });
  }
}

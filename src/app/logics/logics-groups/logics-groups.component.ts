import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
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
import { PickList } from 'primeng/picklist';
import { Select } from 'primeng/select';
import { switchMap } from 'rxjs/operators';
import { LogicsGroupType, LogicsinfoType } from '../../common/models/logics-info';
import { LogService } from '../../common/services/log.service';
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
    PickList,
    FormsModule,
    InputText,
    Dialog,
    PrimeTemplate,
    TranslatePipe,
    Select,
  ],
})
export class LogicsGroupsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private dataServiceServer = inject(ServerApiService);
  private dataService = inject(LogicsApiService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  private readonly groupDescEl = viewChild.required<ElementRef<HTMLElement>>('groupDesc');

  // This component is a stateful editor: after saves it patches its local
  // state instead of re-fetching (deliberate, see saveGroup/executeMerge).
  // Everything written inside an async subscribe AND read by the template is
  // a signal; state only touched by user events stays a plain field.

  // Group list / selection
  logicGroups!: Record<string, LogicsGroupType>;
  readonly groupList = signal<string[]>([]);
  readonly group = signal<LogicsGroupType>({ title: '', description: '' });
  readonly menuGroupList = signal<SelectItem[]>([]);
  readonly selectedGroup = signal<SelectItem | undefined>(undefined);
  readonly myEditGroup = signal('');

  // Unknown groups: referenced in logic.yaml but not defined in logic_groups.yaml
  readonly unknownGroups = signal<Record<string, string[]>>({}); // {groupname: [logicname, ...]}

  // Member pick-list
  allLogics: LogicsinfoType[] = [];
  readonly membersAvailable = signal<LogicsinfoType[]>([]);
  readonly membersInGroup = signal<LogicsinfoType[]>([]);
  private membersOrig: string[] = [];

  // Change tracking
  groupTitleOrig = '';
  groupDescriptionOrig = '';
  readonly groupChanged = signal(false);

  // Dialog state
  error_display = false;
  myTextOutput = '';
  newgroup_display = false;
  newGroupname = '';
  add_enabled = false;
  confirmdelete_display = false;
  delete_param!: {};
  readonly mergeDialog = signal(false);
  readonly mergeTargetName = signal('');
  mergeGroupOptions: SelectItem[] = [];

  ngOnInit() {
    // Load groups and all logics in parallel; we need both before the
    // pick-list can be populated.
    this.dataService
      .getLogics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const data = response as {
          logics: LogicsinfoType[];
          logics_new: LogicsinfoType[];
          groups: Record<string, LogicsGroupType>;
        };

        // Merge loaded + unloaded logics, sorted by name
        this.allLogics = [...(data.logics ?? []), ...(data.logics_new ?? [])].sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
        );

        this.logicGroups = data.groups ?? {};
        this.unknownGroups.set(
          ((data as Record<string, unknown>)['unknown_groups'] as Record<string, string[]>) ?? {},
        );
        this._rebuildGroupMenu();
        this.myEditGroup.set('');
      });
  }

  // ------------------------------------------------------------------
  //  Helpers
  // ------------------------------------------------------------------

  private _rebuildGroupMenu() {
    const names = Object.keys(this.logicGroups).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    this.groupList.set(names);
    this.menuGroupList.set(names.map((g) => ({ label: g, value: g }) as SelectItem));
  }

  /** Split allLogics into "in group" / "available" for the pick-list. */
  private _splitByGroup(groupname: string) {
    const inGroup: LogicsinfoType[] = [];
    const available: LogicsinfoType[] = [];
    for (const logic of this.allLogics) {
      const groups = Array.isArray(logic.group) ? logic.group : logic.group ? [logic.group] : [];
      if (groups.includes(groupname)) {
        inGroup.push(logic);
      } else {
        available.push(logic);
      }
    }
    this.membersInGroup.set(inGroup);
    this.membersAvailable.set(available);
    this.membersOrig = inGroup.map((l) => l.name);
  }

  private _hasMembersChanged(): boolean {
    const current = this.membersInGroup()
      .map((l) => l.name)
      .sort();
    const orig = [...this.membersOrig].sort();
    return current.length !== orig.length || current.some((name, i) => name !== orig[i]);
  }

  hasGroupChanged(): boolean {
    const desc = this.groupDescEl()?.nativeElement?.textContent?.trim() ?? '';
    return (
      this.groupTitleOrig !== this.group()['title'] ||
      this.groupDescriptionOrig !== desc ||
      this._hasMembersChanged()
    );
  }

  onPickListChange() {
    this.groupChanged.set(this.hasGroupChanged());
  }

  // ------------------------------------------------------------------
  //  Group selection
  // ------------------------------------------------------------------

  groupSelected() {
    const group = this.selectedGroup()?.value as string;
    if (!group) {
      this.myEditGroup.set('');
      this.group.set({ title: '', description: '' });
      this._setDescEl('');
      this.membersAvailable.set([...this.allLogics]);
      this.membersInGroup.set([]);
      this.membersOrig = [];
    } else {
      this.myEditGroup.set(group);
      const selected = this.logicGroups[group];
      if (selected.description === undefined) selected.description = '';
      this.group.set(selected);
      this._setDescEl(selected.description);
      this.groupTitleOrig = selected.title;
      this.groupDescriptionOrig = selected.description;
      this._splitByGroup(group);
    }
    this.groupChanged.set(false);
  }

  private _setDescEl(text: string) {
    const el = this.groupDescEl()?.nativeElement;
    if (el) el.textContent = text;
  }

  // ------------------------------------------------------------------
  //  Save / discard
  // ------------------------------------------------------------------

  saveGroup() {
    const desc = this.groupDescEl()?.nativeElement?.textContent?.trim() ?? '';
    const group = this.group();
    group['description'] = desc;

    const members = this.membersInGroup().map((l) => l.name);
    const origMembers = [...this.membersOrig]; // snapshot before async save
    const payload = { ...group, members };

    this.dataService
      .saveLogicGroup(this.myEditGroup(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const groupName = this.myEditGroup();

        // Patch allLogics so _splitByGroup() reflects the new membership
        // when the user switches to another group and back.
        for (const logic of this.allLogics) {
          const inOrig = origMembers.includes(logic.name);
          const inNew = members.includes(logic.name);
          if (inOrig === inNew) continue;

          const groups = Array.isArray(logic.group)
            ? [...logic.group]
            : logic.group
              ? [logic.group]
              : [];

          if (inOrig && !inNew) {
            // Removed from group
            const updated = groups.filter((g) => g !== groupName);
            logic.group = updated.length === 0 ? [''] : updated;
          } else {
            // Added to group
            if (!groups.includes(groupName)) groups.push(groupName);
            logic.group = groups;
          }
        }

        this.groupTitleOrig = group['title'];
        this.groupDescriptionOrig = group['description'];
        this.membersOrig = [...members];
        this.logicGroups[groupName] = group;
        this._setDescEl(group.description);
        this.groupChanged.set(false);
      });
  }

  discardChanges() {
    this.group.update((g) => ({
      ...g,
      title: this.groupTitleOrig,
      description: this.groupDescriptionOrig,
    }));
    this._setDescEl(this.groupDescriptionOrig);
    this._splitByGroup(this.myEditGroup()); // restore pick-list
    this.groupChanged.set(false);
  }

  // ------------------------------------------------------------------
  //  Unknown group resolution
  // ------------------------------------------------------------------

  unknownGroupNames(): string[] {
    return Object.keys(this.unknownGroups());
  }

  createUnknownGroup(groupname: string) {
    const newGroup: LogicsGroupType = { title: '', description: '' };
    // Pass the existing member list so _update_group_members() preserves the
    // logic_groupname entries already in logic.yaml instead of clearing them.
    const existingMembers = this.unknownGroups()[groupname] ?? [];
    this.dataService
      .saveLogicGroup(groupname, { ...newGroup, members: existingMembers })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.logicGroups[groupname] = newGroup;
        this.unknownGroups.update((unknown) => {
          const next = { ...unknown };
          delete next[groupname];
          return next;
        });
        this._rebuildGroupMenu();
      });
  }

  // ------------------------------------------------------------------
  //  Create / delete group
  // ------------------------------------------------------------------

  newGroup() {
    this.newGroupname = '';
    this.add_enabled = false;
    this.newgroup_display = true;
  }

  checkInput() {
    this.add_enabled =
      this.newGroupname.length > 0 &&
      !this.groupList().some((g) => g.toLowerCase() === this.newGroupname.toLowerCase());
  }

  addGroup() {
    this.newgroup_display = false;
    this.myEditGroup.set(this.newGroupname);
    const newGroup: LogicsGroupType = { title: '', description: '' };

    this.dataService
      .saveLogicGroup(this.myEditGroup(), { ...newGroup, members: [] })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const groupName = this.myEditGroup();
        this.logicGroups[groupName] = newGroup;
        this.group.set(newGroup);
        this._setDescEl('');
        this.groupTitleOrig = '';
        this.groupDescriptionOrig = '';
        this.membersInGroup.set([]);
        this.membersAvailable.set([...this.allLogics]);
        this.membersOrig = [];
        this.groupChanged.set(false);
        this._rebuildGroupMenu();
        this.selectedGroup.set({ label: groupName, value: groupName });
      });
  }

  newGroupAbort() {
    this.newGroupname = '';
    this.add_enabled = false;
    this.newgroup_display = false;
    this._setDescEl(this.group().description);
    const groupName = this.myEditGroup();
    this.selectedGroup.set({ label: groupName, value: groupName });
  }

  deleteGroup() {
    this.delete_param = { group: this.myEditGroup() };
    this.confirmdelete_display = true;
  }

  DeleteGroupConfirm() {
    this.confirmdelete_display = false;

    this.dataService
      .deleteLogicGroup(this.myEditGroup())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        delete this.logicGroups[this.myEditGroup()];
        this._rebuildGroupMenu();
        this.myEditGroup.set('');
        this.group.set({ title: '', description: '' });
        this._setDescEl('');
        this.membersAvailable.set([...this.allLogics]);
        this.membersInGroup.set([]);
        this.membersOrig = [];
        this.groupChanged.set(false);
      });
  }

  // ------------------------------------------------------------------
  //  Merge groups
  // ------------------------------------------------------------------

  private _getMembersOfGroup(groupname: string): string[] {
    return this.allLogics
      .filter((l) => {
        const groups = Array.isArray(l.group) ? l.group : l.group ? [l.group] : [];
        return groups.includes(groupname);
      })
      .map((l) => l.name);
  }

  get mergePreviewParams(): Record<string, unknown> {
    const target = this.mergeTargetName();
    if (!target) return {};
    const targetMembers = this._getMembersOfGroup(target);
    const sourceMembers = this.membersInGroup().map((l) => l.name);
    const union = [...new Set([...targetMembers, ...sourceMembers])];
    return {
      added: union.length - targetMembers.length,
      target,
      before: targetMembers.length,
      after: union.length,
    };
  }

  openMergeDialog() {
    this.mergeGroupOptions = this.groupList()
      .filter((g) => g !== this.myEditGroup())
      .map((g) => ({ label: g, value: g }) as SelectItem);
    this.mergeTargetName.set('');
    this.mergeDialog.set(true);
  }

  executeMerge() {
    const sourceName = this.myEditGroup();
    const targetName = this.mergeTargetName();
    const sourceMembers = this.membersInGroup().map((l) => l.name);
    const targetGroup = this.logicGroups[targetName];
    const targetMembers = this._getMembersOfGroup(targetName);
    const mergedMembers = [...new Set([...targetMembers, ...sourceMembers])];

    this.dataService
      .saveLogicGroup(targetName, { ...targetGroup, members: mergedMembers })
      .pipe(
        switchMap(() => this.dataService.deleteLogicGroup(sourceName)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        // Update group field on affected logics locally
        for (const logic of this.allLogics) {
          const groups = Array.isArray(logic.group)
            ? [...logic.group]
            : logic.group
              ? [logic.group]
              : [];
          if (groups.includes(sourceName)) {
            const updated = groups.filter((g) => g !== sourceName);
            if (!updated.includes(targetName)) updated.push(targetName);
            logic.group = updated.length === 1 ? updated[0] : updated;
          }
        }

        delete this.logicGroups[sourceName];
        this._rebuildGroupMenu();

        // Select the merge target
        this.myEditGroup.set(targetName);
        const target = this.logicGroups[targetName];
        if (target.description === undefined) target.description = '';
        this.group.set(target);
        this._setDescEl(target.description);
        this.groupTitleOrig = target.title;
        this.groupDescriptionOrig = target.description;
        this._splitByGroup(targetName);
        this.groupChanged.set(false);
        this.selectedGroup.set({ label: targetName, value: targetName });
        this.mergeDialog.set(false);
        this.mergeTargetName.set('');
      });
  }
}

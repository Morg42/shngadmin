import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate, TreeNode } from 'primeng/api';

import { Title } from '@angular/platform-browser';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { Tree } from 'primeng/tree';
import { map, switchMap, tap } from 'rxjs/operators';
import { LogService } from '../../common/services/log.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { SharedService } from '../../common/services/shared.service';
import { StructsApiService } from '../../common/services/structs-api.service';

type StructsDict = Record<string, Record<string, unknown>>;

@Component({
  selector: 'app-structs',
  templateUrl: './structs.component.html',
  styleUrls: ['./structs.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Accordion,
    AccordionPanel,
    Ripple,
    AccordionHeader,
    AccordionContent,
    ButtonDirective,
    Tree,
    PrimeTemplate,
    TranslatePipe,
  ],
})
export class StructsComponent implements OnInit {
  private dataServiceServer = inject(ServerApiService);
  private translate = inject(TranslateService);
  private dataService = inject(StructsApiService);
  public shared = inject(SharedService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  readonly globalStructsID = 'Individual';

  /** Two-way bound to p-tree's selection; PrimeNG writes it. */
  selectedItem!: TreeNode;

  /** Structs are only fetched after server info has arrived (which also
   *  sets the GUI language) - the old nested subscribes become a switchMap.
   *  The API service returns of({}) on error, which already matches the
   *  empty-dict shape. */
  readonly structsDict = toSignal(
    this.dataServiceServer.getServerinfo().pipe(
      tap(() => this.shared.setGuiLanguage()),
      switchMap(() => this.dataService.getStructs()),
      tap((response) => this.log.log('getStructs', { response })),
      map((response) =>
        response && typeof response === 'object' ? (response as StructsDict) : ({} as StructsDict),
      ),
    ),
    { initialValue: {} as StructsDict },
  );

  readonly structsList = computed(() => Object.keys(this.structsDict()).sort());

  /** Group prefixes in display order: 'my' (structs without a dot, i.e. user
   *  defined ones) first, then plugin prefixes in list order. */
  readonly structsGroups = computed(() => {
    const groups: string[] = [];
    for (const name of this.structsList()) {
      const prefix = name.split('.').length === 1 ? 'my' : name.split('.')[0];
      if (!groups.includes(prefix)) {
        if (prefix === 'my') {
          groups.unshift(prefix);
        } else {
          groups.push(prefix);
        }
      }
    }
    return groups;
  });

  /** One PrimeNG display tree per struct. linkedSignal: rebuilt from scratch
   *  whenever a new structs dict arrives, but individually replaceable by
   *  expandAll/collapseAll (which mutate TreeNode.expanded and swap the
   *  entry to trigger OnPush). */
  readonly displayTrees = linkedSignal(() => {
    const dict = this.structsDict();
    const trees: Record<string, TreeNode[]> = {};
    for (const key of Object.keys(dict)) {
      trees[key] = this.buildDisplayTree(dict[key]) as TreeNode[];
    }
    return trees;
  });

  ngOnInit() {
    this.log.log('StructsComponent.ngOnInit');
    this.titleService.setTitle(this.translate.instant('ITEMS.STRUCT_CONFIGFILE'));
  }

  // -------------------------------------------------------------------------------------------
  // build a display tree for the PrimeNG component from the itemtree received from the backend
  //
  buildDisplayTree(subtree: Record<string, unknown> | unknown[]) {
    const displayTreeList: Record<string, unknown>[] = [];
    const asRecord = subtree as Record<string, unknown>;
    for (const key in subtree) {
      if (key in subtree) {
        const displayNode: Record<string, unknown> = {};
        if (Array.isArray(subtree)) {
          displayNode['label'] = '- ' + asRecord[key];
        } else {
          const val = asRecord[key];
          if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            displayNode['label'] = key + ': ' + val;
          } else {
            displayNode['label'] = key;
          }
        }
        const val = asRecord[key];
        if (typeof val === 'object' && val !== null) {
          const children = this.buildDisplayTree(val as Record<string, unknown>);
          if (children.length > 0) {
            displayNode['children'] = children;
          } else {
            displayNode['leaf'] = true;
          }
        }
        displayTreeList.push(displayNode);
      }
    }
    return displayTreeList;
  }

  expandAll(tree: TreeNode[], structKey: string) {
    tree.forEach((node) => this.expandRecursive(node, true));
    this.displayTrees.update((trees) => ({ ...trees, [structKey]: [...tree] }));
  }

  collapseAll(tree: TreeNode[], structKey: string) {
    tree.forEach((node) => this.expandRecursive(node, false));
    this.displayTrees.update((trees) => ({ ...trees, [structKey]: [...tree] }));
  }

  getStructListByGroup(group: string) {
    const structSublist: string[] = [];
    for (const name of this.structsList()) {
      if (group === 'my' && name.split('.').length === 1) {
        structSublist.push(name);
      }
      if (group === this.globalStructsID && name.split('.').length === 1) {
        structSublist.push(name);
      }
      if (name.indexOf(group + '.') === 0) {
        structSublist.push(name);
      }
    }
    return structSublist;
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

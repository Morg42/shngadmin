import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { SelectItem } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { ItemAttributeInfo } from '../models/item-attribute-info';
import { PlugininfoType } from '../models/plugin-info';
import { ItemsApiService } from './items-api.service';
import { PluginsApiService } from './plugins-api.service';

/** attributeCatalog entry, tagged with where it came from ('core' or a plugin
 *  name) so the attribute browser can group suggestions by source. */
export interface AttributeCatalogEntry extends ItemAttributeInfo {
  source: string;
}

export interface AttributeGroup {
  source: string;
  entries: { name: string; entry: AttributeCatalogEntry }[];
}

@Injectable({ providedIn: 'root' })
export class AttributeCatalogService {
  private readonly itemsApi = inject(ItemsApiService);
  private readonly pluginsApi = inject(PluginsApiService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Core + plugin item attributes, keyed by name, loaded from the backend
   *  (items/attributes and plugins/info) and offered as autocomplete suggestions
   *  when adding free-text attributes to a new item. Also the source for the
   *  "type" field's value list and for attribute hint text. */
  readonly attributeCatalog = signal<Record<string, AttributeCatalogEntry>>({});
  readonly attributeCatalogLoaded = signal(false);
  /** Same data as attributeCatalog, pre-grouped by source ('core' first, then
   *  plugins alphabetically) for the attribute browser dialog. */
  readonly attributeGroups = signal<AttributeGroup[]>([]);

  /** A computed signal, not a getter: a getter re-evaluated on every
   *  change-detection tick would return a brand-new array of brand-new
   *  object literals each time, and PrimeNG's p-select renders [options]
   *  via *ngFor with no trackBy of its own - it can't tell that "new" array
   *  apart from a different one, so it would tear down and rebuild every
   *  dropdown option (and its click listener) on every unrelated CD tick
   *  that happens while the "Datentyp" dropdown sits open in the
   *  create/edit-item dialogs. Same mechanism that made the item-tree
   *  "more actions" popup silently eat clicks (see item-tree.component.ts's
   *  itemActionsMenuItems). computed() only re-runs when attributeCatalog()
   *  actually changes, so the array/object identity stays stable between
   *  real catalog reloads.
   *
   *  Why computed() here and not a plain signal() rebuilt by hand (the
   *  style item-tree.component.ts's itemActionsMenuItems and
   *  plugin-config.component.ts's deleteActionOptions use for the same
   *  click-eating fix): this value is *derived from another signal*
   *  (attributeCatalog() above) with no other trigger involved - no RxJS
   *  event, no explicit "rebuild now" call site. computed() is the
   *  built-in, correct tool for exactly that: recompute automatically
   *  whenever the signals read inside it change. The alternative - an
   *  effect() watching attributeCatalog() and pushing the result into a
   *  plain signal - is the anti-pattern Angular's own guidance warns
   *  against (effects are for side effects, not for deriving one signal's
   *  value from another). Use computed() whenever a value's only real
   *  dependencies are other signals; reach for a plain signal + manual
   *  rebuild only when a dependency isn't a signal, like an RxJS event or
   *  an explicit user action. */
  readonly itemTypeOptions = computed<SelectItem[]>(() => {
    const validList = this.attributeCatalog()['type']?.valid_list ?? [];
    return validList.map((t) => ({ label: t, value: t }));
  });

  /** name/type have their own dedicated dialog fields, so they're excluded from
   *  the free-text attribute autocomplete suggestions. */
  static readonly ATTRIBUTES_WITH_DEDICATED_FIELDS = ['name', 'type'];

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
            if (AttributeCatalogService.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(attr.name))
              continue;
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
      if (AttributeCatalogService.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(name)) continue;
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
}

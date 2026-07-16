import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import {
  AttributeCatalogService,
  AttributeGroup,
} from '../../common/services/attribute-catalog.service';

/** Extracted from ItemTreeComponent — the same dialog is embedded by both the
 *  create-item and edit-item dialogs (each binds its own [(rows)]), rather
 *  than the two of them being welded together via a shared "which dialog is
 *  active" flag the way this used to work inside ItemTreeComponent. */
@Component({
  selector: 'app-attribute-browser',
  templateUrl: './attribute-browser.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, FormsModule, InputText, TranslatePipe],
})
export class AttributeBrowserComponent {
  private readonly translate = inject(TranslateService);
  readonly attributeCatalogService = inject(AttributeCatalogService);

  readonly rows = model<{ key: string; value: unknown }[]>([]);
  readonly visible = model(false);

  attributeBrowserSearch = '';

  open() {
    this.attributeBrowserSearch = '';
    this.visible.set(true);
  }

  get filteredAttributeGroups(): AttributeGroup[] {
    const q = this.attributeBrowserSearch.toLowerCase();
    const used = this.rows().map((a) => a.key);
    return this.attributeCatalogService
      .attributeGroups()
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

  /** Fills the first empty attribute row with the chosen name (adding a new
   *  row if none is empty), then closes the browser. A direct update() on
   *  rows() itself, not a value derived from rows() and written back by
   *  something else — see attribute-browser.component.spec.ts for why that
   *  distinction matters (attribute-value-input.component.ts hit the
   *  opposite pattern earlier in this refactor and silently dropped
   *  in-progress edits because of it). */
  selectAttributeFromBrowser(name: string) {
    this.rows.update((rows) => {
      const emptyRowIndex = rows.findIndex((a) => a.key === '');
      return emptyRowIndex === -1
        ? [...rows, { key: name, value: '' }]
        : rows.map((a, i) => (i === emptyRowIndex ? { ...a, key: name } : a));
    });
    this.visible.set(false);
  }
}

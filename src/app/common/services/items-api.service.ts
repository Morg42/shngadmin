import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ItemAttributeInfo } from '../models/item-attribute-info';
import { ItemCopyResult } from '../models/item-copy-result';
import { ItemReference } from '../models/item-reference';
import { ItemRemoveReferencesResult } from '../models/item-remove-references-result';
import { ItemRenameResult } from '../models/item-rename-result';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class ItemsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  getItemList() {
    const url = this.appConfig.apiUrl + 'items/list/';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ItemsApiService.getItemList(): Could not read item list - ' + err.error?.error,
        );
        return of([]);
      }),
    );
  }

  getItemTree() {
    const url = this.appConfig.apiUrl + 'items/tree';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ItemsApiService.getItemTree(): Could not read item tree - ' + err.error?.error,
        );
        return of([]);
      }),
    );
  }

  getCoreItemAttributes() {
    const url = this.appConfig.apiUrl + 'items/attributes';
    return this.http.get(url).pipe(
      map((response) => response as Record<string, ItemAttributeInfo>),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ItemsApiService.getCoreItemAttributes(): Could not read attribute catalog - ' +
            err.error?.error,
        );
        return of({} as Record<string, ItemAttributeInfo>);
      }),
    );
  }

  getItemDetails(itemPath: string) {
    const url = this.appConfig.apiUrl + 'items/' + encodeURIComponent(itemPath);
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ItemsApiService.getItemDetails(' +
            itemPath +
            '): Could not read item details - ' +
            err.error?.error,
        );
        return of([]);
      }),
    );
  }

  changeItemValue(itemPath: string, value: string | number | boolean) {
    const url = this.appConfig.apiUrl + 'items/' + encodeURIComponent(itemPath);
    return this.http.put(url, JSON.stringify({ value })).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ItemsApiService.changeItemValue(' +
            itemPath +
            '): Could not set value - ' +
            err.error?.error,
        );
        return of({});
      }),
    );
  }

  /** No catchError — callers need the real error (e.g. duplicate path, or a
   *  name collision on an auto-created ancestor) to react to. filename is
   *  left out of the body entirely (rather than sent as '') when
   *  undefined, so the backend's own default (sh._created_items_file)
   *  applies cleanly. createMissingParents auto-creates the whole missing
   *  ancestor chain server-side (each as an empty item) instead of the
   *  default 400 on a missing immediate parent. */
  createItem(
    itemPath: string,
    config: Record<string, unknown>,
    persist = true,
    filename?: string,
    createMissingParents = false,
  ) {
    const url = this.appConfig.apiUrl + 'items/' + encodeURIComponent(itemPath);
    const body: Record<string, unknown> = { config, persist };
    if (filename) {
      body['filename'] = filename;
    }
    if (createMissingParents) {
      body['create_missing_parents'] = true;
    }
    return this.http.post(url, JSON.stringify(body));
  }

  /** No catchError — callers need the real error (e.g. name collision while
   *  also renaming, or a malformed config) to react to. config must be the
   *  COMPLETE new attribute set (same convention as createItem()'s config) —
   *  omitting a key resets it to its default, there's no partial-patch. */
  editItem(itemPath: string, config: Record<string, unknown>) {
    const url = this.appConfig.apiUrl + 'items/' + encodeURIComponent(itemPath);
    return this.http.patch(url, JSON.stringify({ config }));
  }

  /** No catchError — callers need the real error (e.g. name collision,
   *  target parent not found, moving into the item's own subtree) to react
   *  to. A new_path whose parent segment differs from the current one
   *  triggers a move — same endpoint, no separate move method/route. */
  renameItem(itemPath: string, newPath: string, filename?: string) {
    const url = this.appConfig.apiUrl + 'items/' + encodeURIComponent(itemPath) + '/rename';
    const body: Record<string, unknown> = { new_path: newPath };
    if (filename) {
      body['filename'] = filename;
    }
    return this.http
      .post(url, JSON.stringify(body))
      .pipe(map((response) => response as ItemRenameResult));
  }

  /** No catchError — callers need the real error (e.g. name collision, target
   *  parent not found, or the source item not being persisted) to react to.
   *  Only persisted items can be copied — see Items.copy_item(). The copy is
   *  written to the SOURCE item's own file by default (not the new parent's),
   *  so its config stays "the same, elsewhere". includeChildren defaults to
   *  true (the whole subtree); set false to copy only the item itself. */
  copyItem(itemPath: string, newPath: string, filename?: string, includeChildren = true) {
    const url = this.appConfig.apiUrl + 'items/' + encodeURIComponent(itemPath) + '/copy';
    const body: Record<string, unknown> = { new_path: newPath };
    if (filename) {
      body['filename'] = filename;
    }
    if (!includeChildren) {
      body['include_children'] = false;
    }
    return this.http
      .post(url, JSON.stringify(body))
      .pipe(map((response) => response as ItemCopyResult));
  }

  /** No catchError — callers need the real error (e.g. plugin refused
   *  removal, or the item has sub-items and recursive wasn't set) to
   *  react to. persist/recursive are sent as query params, not a JSON
   *  body — cherrypy doesn't run its normal body-processing for DELETE
   *  requests, so a body would never be read. */
  deleteItem(itemPath: string, persist = true, recursive = false) {
    const url =
      this.appConfig.apiUrl +
      'items/' +
      encodeURIComponent(itemPath) +
      '?persist=' +
      persist +
      '&recursive=' +
      recursive;
    return this.http.delete(url);
  }

  /** No catchError — callers need to know if this failed (vs. succeeded with
   *  some skipped_ambiguous entries, which is a normal outcome, not an error)
   *  so they can decide whether to still proceed with a subsequent delete. */
  removeReferences(itemPath: string) {
    const url =
      this.appConfig.apiUrl + 'items/' + encodeURIComponent(itemPath) + '/remove_references';
    return this.http.post(url, '').pipe(map((response) => response as ItemRemoveReferencesResult));
  }

  getItemReferences(itemPath: string) {
    const url = this.appConfig.apiUrl + 'items/' + encodeURIComponent(itemPath) + '/references';
    return this.http.get(url).pipe(
      map((response) => response as ItemReference[]),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ItemsApiService.getItemReferences(' +
            itemPath +
            '): Could not read references - ' +
            err.error?.error,
        );
        return of(null);
      }),
    );
  }
}

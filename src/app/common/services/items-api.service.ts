import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ItemAttributeInfo } from '../models/item-attribute-info';
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
      map((response) => response),
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
      map((response) => response),
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
    const url = this.appConfig.apiUrl + 'items/' + itemPath;
    return this.http.get(url).pipe(
      map((response) => response),
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
    const url = this.appConfig.apiUrl + 'items/' + itemPath;
    return this.http.put(url, JSON.stringify({ value })).pipe(
      map((response) => response),
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

  /** No catchError — callers need the real error (e.g. duplicate path) to react to.
   *  filename is left out of the body entirely (rather than sent as '') when undefined,
   *  so the backend's own default (sh._created_items_file) applies cleanly. */
  createItem(itemPath: string, config: Record<string, unknown>, persist = true, filename?: string) {
    const url = this.appConfig.apiUrl + 'items/' + itemPath;
    const body: Record<string, unknown> = { config, persist };
    if (filename) {
      body['filename'] = filename;
    }
    return this.http.post(url, JSON.stringify(body)).pipe(map((response) => response));
  }

  /** No catchError — callers need the real error (e.g. name collision while
   *  also renaming, or a malformed config) to react to. config must be the
   *  COMPLETE new attribute set (same convention as createItem()'s config) —
   *  omitting a key resets it to its default, there's no partial-patch. */
  editItem(itemPath: string, config: Record<string, unknown>) {
    const url = this.appConfig.apiUrl + 'items/' + itemPath;
    return this.http.patch(url, JSON.stringify({ config })).pipe(map((response) => response));
  }

  /** No catchError — callers need the real error (e.g. name collision,
   *  target parent not found, moving into the item's own subtree) to react
   *  to. A new_path whose parent segment differs from the current one
   *  triggers a move — same endpoint, no separate move method/route. */
  renameItem(itemPath: string, newPath: string, filename?: string) {
    const url = this.appConfig.apiUrl + 'items/' + itemPath + '/rename';
    const body: Record<string, unknown> = { new_path: newPath };
    if (filename) {
      body['filename'] = filename;
    }
    return this.http
      .post(url, JSON.stringify(body))
      .pipe(map((response) => response as ItemRenameResult));
  }

  /** No catchError — callers need the real error (e.g. plugin refused removal) to react to.
   *  persist is sent as a query param, not a JSON body — cherrypy doesn't run its
   *  normal body-processing for DELETE requests, so a body would never be read. */
  deleteItem(itemPath: string, persist = true) {
    const url = this.appConfig.apiUrl + 'items/' + itemPath + '?persist=' + persist;
    return this.http.delete(url).pipe(map((response) => response));
  }

  /** No catchError — callers need to know if this failed (vs. succeeded with
   *  some skipped_ambiguous entries, which is a normal outcome, not an error)
   *  so they can decide whether to still proceed with a subsequent delete. */
  removeReferences(itemPath: string) {
    const url = this.appConfig.apiUrl + 'items/' + itemPath + '/remove_references';
    return this.http.post(url, '').pipe(map((response) => response as ItemRemoveReferencesResult));
  }

  getItemReferences(itemPath: string) {
    const url = this.appConfig.apiUrl + 'items/' + itemPath + '/references';
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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
}

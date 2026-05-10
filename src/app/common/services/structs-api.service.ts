import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root',
})
export class StructsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  getStructs() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'items/structs/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'StructsApiService (getStructs): Could not read structs data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }
}

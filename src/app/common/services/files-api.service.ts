import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root',
})
export class FilesApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  readFile(filetype, filename = '') {
    // console.log('FilesApiService.readFile()', {filename});

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'files/' + filetype + '/';
    if (filename !== '') {
      url += '?filename=' + filename;
    }
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error({ err });
        if (filename === '') {
          console.error(
            "FilesApiService (readFile): Could not read filetype '" +
              filetype +
              "' - error: " +
              err.error.error,
          );
        } else {
          console.error(
            "FilesApiService (readFile): Could not read filetype '" +
              filetype +
              "', filename '" +
              filename +
              "' - error: " +
              err.error.error,
          );
        }

        return of('');
      }),
    );
  }

  saveFile(filetype, filename = '', content = '') {
    // console.log('FilesApiService.saveFile');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'files/' + filetype + '/';
    if (filename !== '') {
      url += '?filename=' + filename;
    }
    return this.http.put(url, content, { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;

        if (result) {
          // console.log('ServicesApiService.CheckYamlText', '- config:', yamlText, '\nresult', {result});
          return result;
        } else {
          console.log('FilesApiService.saveFile', 'fail: undefined result');
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'FilesApiService.saveFile: Could not save config data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  deleteFile(filetype, filename = '') {
    console.log('FilesApiService.deleteFile()', { filename });

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'files/' + filetype + '/';
    if (filename !== '') {
      url += '?filename=' + filename;
    }
    console.log('FilesApiService.deleteFile()', { url });

    return this.http.delete(url, { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error({ err });
        if (filename === '') {
          console.error(
            "FilesApiService.deleteFile(): Could not delete filetype '" +
              filetype +
              "' - error: " +
              err.error.error,
          );
        } else {
          console.error(
            "FilesApiService.deleteFile(): Could not delete filetype '" +
              filetype +
              "', filename '" +
              filename +
              "' - error: " +
              err.error.error,
          );
        }

        return of('');
      }),
    );
  }

  getfileList(filetype) {
    console.log('FilesApiService.getfileList()', { filetype });

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'files/' + filetype + '/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'FilesApiService.getfileList: Could not read file list' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

export interface LoggingConfigSaveResult {
  result: 'ok' | 'error';
  config_reloaded?: boolean;
  config_restored?: boolean;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FilesApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  readFile(filetype: string, filename = '') {
    // this.log.log('FilesApiService.readFile()', {filename});

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
        this.log.error({ err });
        if (filename === '') {
          this.log.error(
            "FilesApiService (readFile): Could not read filetype '" +
              filetype +
              "' - error: " +
              err.error.error,
          );
        } else {
          this.log.error(
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

  saveFile(filetype: string, filename = '', content = '') {
    // this.log.log('FilesApiService.saveFile');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'files/' + filetype + '/';
    if (filename !== '') {
      url += '?filename=' + filename;
    }
    return this.http.put(url, content, { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;

        if (result) {
          // this.log.log('ServicesApiService.CheckYamlText', '- config:', yamlText, '\nresult', {result});
          return result;
        } else {
          this.log.log('FilesApiService.saveFile', 'fail: undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'FilesApiService.saveFile: Could not save config data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  saveLoggingConfig(content: string) {
    const url = this.appConfig.apiUrl + 'files/logging/';
    return this.http.put<LoggingConfigSaveResult>(url, content).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error('FilesApiService.saveLoggingConfig: ' + err.message);
        return of<LoggingConfigSaveResult>({
          result: 'error',
          config_restored: false,
          description: err.error?.error ?? err.message,
        });
      }),
    );
  }

  deleteFile(filetype: string, filename = '') {
    this.log.log('FilesApiService.deleteFile()', { filename });

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'files/' + filetype + '/';
    if (filename !== '') {
      url += '?filename=' + filename;
    }
    this.log.log('FilesApiService.deleteFile()', { url });

    return this.http.delete(url, { responseType: 'text' }).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error({ err });
        if (filename === '') {
          this.log.error(
            "FilesApiService.deleteFile(): Could not delete filetype '" +
              filetype +
              "' - error: " +
              err.error.error,
          );
        } else {
          this.log.error(
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

  getfileList(filetype: string) {
    this.log.log('FilesApiService.getfileList()', { filetype });

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'files/' + filetype + '/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'FilesApiService.getfileList: Could not read file list' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }
}

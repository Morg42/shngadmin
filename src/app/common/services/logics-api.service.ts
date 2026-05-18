import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { MessageService } from 'primeng/api';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

interface ApiResult {
  result: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LogicsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);
  private readonly messageService = inject(MessageService);

  private readonly _groupExpanded = new BehaviorSubject<number[]>([]);
  readonly groupExpanded$ = this._groupExpanded.asObservable();

  get groupExpanded(): number[] {
    return this._groupExpanded.value;
  }

  set groupExpanded(value: number[]) {
    this._groupExpanded.next(value);
  }

  getGroupsInfo() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'logics/' + '?infotype=groups';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        // this.log.warn('LogicsApiService.getGroupsInfo(): ', result);
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogicsApiService.getGroupsInfo(): Could not read groups data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  getLogics() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'logics/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogicsApiService.getLogics(): Could not read logics data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  getLogic(logicname: string) {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'logics/' + logicname;
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogicsApiService.getLogic(' +
            logicname +
            '): Could not read logics data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  getLogicState(logicname: string) {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'logics/' + logicname + '?infotype=status';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        // this.log.warn('LogicsApiService.getLogicState(' + logicname + '): ', result);
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogicsApiService.getLogicState(' +
            logicname +
            '): Could not read logics data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  setLogicState(logicName: string, action: string, filename = '') {
    // valid actions are: 'trigger', 'enable', 'disable', 'load', 'unload', 'reload', 'delete', 'create'
    action = action.toLowerCase();
    // this.log.warn('LogicsApiService.setLogicState', {logicName}, {action});

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'logics/' + logicName + '?action=' + action;
    if (filename !== '') {
      url += '&filename=' + filename;
    }
    return this.http.put(url, JSON.stringify('')).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          // this.log.log('LogicsApiService.setLogicState', '- config', config, '\nresult', {result});
          if (result.result === 'ok') {
            // this.log.log('LogicsApiService.setLogicState', 'success');
            return true;
          } else {
            this.log.warn('LogicsApiService.setLogicState', result.result, result.description);
            this.messageService.add({
              severity: 'error',
              summary: result.result,
              detail: result.description,
              sticky: true,
            });
            return false;
          }
        } else {
          this.log.log('LogicsApiService.setLogicState', 'failed: Undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogicsApiService.setLogicState: Could not set logic state' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  saveLogicParameters(logicName: string, paramObj: unknown) {
    // paramObj is a dict containing the entries of the parameter section in etc/logic.yamls
    // parameters to be deleted must be included with an empty string as value!
    // this.log.warn('LogicsApiService.saveLogicParameters', {logicName}, {paramObj});

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'logics/' + logicName + '?action=' + 'saveparameters';
    return this.http.put(url, JSON.stringify(paramObj)).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          // this.log.log('LogicsApiService.setLogicState', '- config', config, '\nresult', {result});
          if (result.result === 'ok') {
            // this.log.log('LogicsApiService.setLogicState', 'success');
            return true;
          } else {
            this.log.warn(
              'LogicsApiService.saveLogicParameters',
              result.result,
              result.description,
            );
            this.messageService.add({
              severity: 'error',
              summary: result.result,
              detail: result.description,
              sticky: true,
            });
            return false;
          }
        } else {
          this.log.log('LogicsApiService.setLogicState', 'fail: undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogicsApiService.saveLogicParameters: Could not save logic parameters' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  saveLogicGroup(groupName: string, group: unknown) {
    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'logics/' + groupName + '?action=' + 'savegroup';
    return this.http.put(url, JSON.stringify(group)).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          this.log.log('LogicsApiService.saveLogicGroup', '- group', groupName, '\nresult', {
            result,
          });
          if (result.result === 'ok') {
            this.log.log('LogicsApiService.saveLogicGroup', 'success');
            return true;
          } else {
            this.log.warn('LogicsApiService.saveLogicGroup', result.result, result.description);
            this.messageService.add({
              severity: 'error',
              summary: result.result,
              detail: result.description,
              sticky: true,
            });
            return false;
          }
        } else {
          this.log.log('LogicsApiService.saveLogicGroup', 'fail: undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogicsApiService.saveLogicGroup: Could not save logic group' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  deleteLogicGroup(groupName: string) {
    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'logics/' + groupName + '?action=' + 'deletegroup';
    return this.http.put(url, JSON.stringify('')).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          this.log.log('LogicsApiService.deleteLogicGroup', '- group', groupName, '\nresult', {
            result,
          });
          if (result.result === 'ok') {
            this.log.log('LogicsApiService.deleteLogicGroup', 'success');
            return true;
          } else {
            this.log.warn('LogicsApiService.deleteLogicGroup', result.result, result.description);
            this.messageService.add({
              severity: 'error',
              summary: result.result,
              detail: result.description,
              sticky: true,
            });
            return false;
          }
        } else {
          this.log.log('LogicsApiService.deleteLogicGroup', 'fail: undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'LogicsApiService.deleteLogicGroup: Could not delete logic group' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }
}

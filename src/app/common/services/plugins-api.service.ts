import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

interface ApiResult {
  result: string;
  description?: string;
}

/** Dispatched server-side in modules/admin/api_plugin.py's PluginController.update():
 *  'start'/'stop' -> handle_plugin_action(); 'load'/'unload'/'reload' -> handle_plugin_lifecycle(). */
export type PluginStateAction = 'start' | 'stop' | 'load' | 'unload' | 'reload';

@Injectable({
  providedIn: 'root',
})
export class PluginsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);
  private readonly messageService = inject(MessageService);

  // ---------------------------------------------------------------------
  //  Get information about the plugins installed in ../plugins directory
  //
  getInstalledPlugins() {
    // this.log.log('PluginsApiService.getInstalledPlugins');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/installed/';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService (getInstalledPlugins): Could not read plugins data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // ------------------------------------------------------------
  //  Get configuration information about all configured plugins
  //  - for plugins-config.component
  //
  getPluginsConfig() {
    // this.log.log('PluginsApiService.getPluginsConfig');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/config/';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService (getPluginsConfig): Could not read plugins data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // ------------------------------------------------------------
  //  Get configuration information about all configured plugins
  //  - for plugins.component
  //
  getPluginsInfo() {
    // this.log.log('PluginsApiService.getPluginsInfo');

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'plugins/info/';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService (getPluginsInfo): Could not read plugins data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // ------------------------------------------------------------
  //  Get configuration information about logic parameters of
  //  all configured plugins for logic editor
  //
  getPluginsLogicParameters() {
    // this.log.log('PluginsApiService.getPluginsInfo');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/logicparams/';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService (getPluginsLogicParameters): Could not read plugins data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // ------------------------------------------------------------
  //  Get configuration information about all configured plugins
  //  - for plugins.component
  //
  getPluginsAPI() {
    // this.log.log('PluginsApiService.getPluginsApi');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/api/';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService (getPluginsInfo): Could not read plugins data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // -----------------------------------------------------------
  //  Update config of one plugin in etc/plugin.yaml on backend
  //
  setPluginConfig(pluginsection: string, config: unknown) {
    // this.log.log('PluginsApiService.setPluginConfig');

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'plugin/' + encodeURIComponent(pluginsection) + '/';
    return this.http.put(url, JSON.stringify(config)).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          // this.log.log('PluginsApiService.setPluginConfig', '- config', config, '\nresult', {result});
          if (result.result === 'ok') {
            return true;
          } else {
            this.log.error(
              'PluginsApiService.setPluginConfig failed:',
              result.result,
              result.description,
            );
            return false;
          }
        } else {
          this.log.log('PluginsApiService.setPluginConfig', 'fail: undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService (setPluginConfig): Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // -----------------------------------------------------------
  //  add a new config of one plugin in etc/plugin.yaml on backend
  //
  addPluginConfig(pluginsection: string, config: unknown) {
    // this.log.log('PluginsApiService.addPluginConfig');

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'plugin/' + encodeURIComponent(pluginsection) + '/';
    return this.http.post(url, JSON.stringify(config)).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          this.log.log('PluginsApiService.addPluginConfig', '- config', config, '\nresult', {
            result,
          });
          if (result.result === 'ok') {
            return true;
          } else {
            this.log.error(
              'PluginsApiService.addPluginConfig failed:',
              result.result,
              result.description,
            );
            // The dialog that triggers this has already closed by the time
            // this response arrives (optimistic close), so a toast is the
            // only way the user finds out why the add didn't go through -
            // e.g. a legacy-instance-name collision the dialog can't detect
            // client-side (see modules/admin/api_plugin.py's add()). Matches
            // the same result/description-as-toast pattern LogicsApiService
            // already uses for setLogicState().
            this.messageService.add({
              severity: 'error',
              summary: result.result,
              detail: result.description,
              sticky: true,
            });
            return false;
          }
        } else {
          this.log.log('PluginsApiService.addPluginConfig', 'fail: undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService (addPluginConfig): Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // -----------------------------------------------------------
  //  add a new config of one plugin in etc/plugin.yaml on backend
  //
  deletePluginConfig(pluginsection: string) {
    // this.log.log('PluginsApiService.deletePluginConfig\n', {pluginsection});

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'plugin/' + encodeURIComponent(pluginsection) + '/';
    return this.http.delete(url).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          this.log.log(
            'PluginsApiService.deletePluginConfig',
            '- section',
            pluginsection,
            '\nresult',
            { result },
          );
          if (result.result === 'ok') {
            return true;
          } else {
            this.log.error(
              'PluginsApiService.deletePluginConfig failed:',
              result.result,
              result.description,
            );
            return false;
          }
        } else {
          this.log.log('PluginsApiService.deletePluginConfig', 'fail: undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService (deletePluginConfig): Could not set plugin config data' +
            ' - ' +
            err.error.error,
        );
        return of({});
      }),
    );
  }

  // -----------------------------------------------------------
  //  set plugin state to started/stopped
  //
  setPluginState(pluginConfigName: string, action: PluginStateAction, filename = '') {
    this.log.warn('PluginsApiService.setPluginState', { pluginConfigName }, { action });

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugin/' + encodeURIComponent(pluginConfigName) + '?action=' + action;
    if (filename !== '') {
      url += '&filename=' + encodeURIComponent(filename);
    }
    return this.http.put(url, JSON.stringify('')).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          // this.log.log('PluginsApiService.setPluginState', '- config', config, '\nresult', {result});
          if (result.result === 'ok') {
            return true;
          } else {
            this.log.error(
              'PluginsApiService.setPluginState failed:',
              result.result,
              result.description,
            );
            return false;
          }
        } else {
          this.log.log('PluginsApiService.setPluginState', 'fail: undefined result');
          return undefined;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'PluginsApiService.setPluginState: Could not set logic state' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }
}

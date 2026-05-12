import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

interface ApiResult {
  result: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PluginsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  // ---------------------------------------------------------------------
  //  Get information about the plugins installed in ../plugins directory
  //
  getInstalledPlugins() {
    // console.log('PluginsApiService.getInstalledPlugins');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/installed/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
    // console.log('PluginsApiService.getPluginsConfig');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/config/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
    // console.log('PluginsApiService.getPluginsInfo');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/info/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
    // console.log('PluginsApiService.getPluginsInfo');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/logicparams/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
    // console.log('PluginsApiService.getPluginsApi');

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugins/api/';
    return this.http.get(url).pipe(
      map((response) => {
        const result = response;
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
  setPluginConfig(pluginsection, config) {
    // console.log('PluginsApiService.setPluginConfig');

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'plugin/' + pluginsection + '/';
    return this.http.put(url, JSON.stringify(config)).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          // console.log('PluginsApiService.setPluginConfig', '- config', config, '\nresult', {result});
          if (result.result === 'ok') {
            return true;
          } else {
            console.error(
              'PluginsApiService.setPluginConfig failed:',
              result.result,
              result.description,
            );
            return false;
          }
        } else {
          console.log('PluginsApiService.setPluginConfig', 'fail: undefined result');
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
  addPluginConfig(pluginsection, config) {
    // console.log('PluginsApiService.addPluginConfig');

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'plugin/' + pluginsection + '/';
    return this.http.post(url, JSON.stringify(config)).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          console.log('PluginsApiService.addPluginConfig', '- config', config, '\nresult', {
            result,
          });
          if (result.result === 'ok') {
            return true;
          } else {
            console.error(
              'PluginsApiService.addPluginConfig failed:',
              result.result,
              result.description,
            );
            return false;
          }
        } else {
          console.log('PluginsApiService.addPluginConfig', 'fail: undefined result');
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
  deletePluginConfig(pluginsection) {
    // console.log('PluginsApiService.deletePluginConfig\n', {pluginsection});

    const apiUrl = this.appConfig.apiUrl;
    const url = apiUrl + 'plugin/' + pluginsection + '/';
    return this.http.delete(url).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          console.log(
            'PluginsApiService.deletePluginConfig',
            '- section',
            pluginsection,
            '\nresult',
            { result },
          );
          if (result.result === 'ok') {
            return true;
          } else {
            console.error(
              'PluginsApiService.deletePluginConfig failed:',
              result.result,
              result.description,
            );
            return false;
          }
        } else {
          console.log('PluginsApiService.deletePluginConfig', 'fail: undefined result');
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
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
  setPluginState(pluginConfigName, action, filename = '') {
    // valid actions are: 'trigger', 'enable', 'disable', 'load', 'unload', 'reload', 'delete', 'create'
    action = action.toLowerCase();
    console.warn('PluginsApiService.setPluginState', { pluginConfigName }, { action });

    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'plugin/' + pluginConfigName + '?action=' + action;
    if (filename !== '') {
      url += '&filename=' + filename;
    }
    return this.http.put(url, JSON.stringify('')).pipe(
      map((response) => {
        const result = response as ApiResult;

        if (result) {
          // console.log('PluginsApiService.setPluginState', '- config', config, '\nresult', {result});
          if (result.result === 'ok') {
            return true;
          } else {
            console.error(
              'PluginsApiService.setPluginState failed:',
              result.result,
              result.description,
            );
            return false;
          }
        } else {
          console.log('PluginsApiService.setPluginState', 'fail: undefined result');
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(
          'PluginsApiService.setPluginState: Could not set logic state' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }
}

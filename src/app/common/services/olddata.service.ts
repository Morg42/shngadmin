//import {APP_BASE_HREF} from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
//import {SystemInfo} from '../models/system-info';
// import {ServerInfo} from '../models/server-info';

let url_start: string = 'http://';
let host_ip: string = '';
// let shng_serverinfo: ServerInfo = <ServerInfo>{'itemtree_fullpath': true};

@Injectable({
  providedIn: 'root',
})
export class OlddataService {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  baseUrl = inject<string>('BASE_URL' as unknown as InjectionToken<string>);

  href = '';

  constructor() {
    this.translate.setDefaultLang('en');

    if (host_ip === '') {
      host_ip = location.host;
      url_start = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/'; // + 'admin/';
    }
  }
  getSysteminfo() {
    const url = url_start + 'systeminfo.json\\';
    console.log('OlddataService.getSysteminfo: url: ' + url);
    return this.http.get(url);
  }

  getPypiinfo() {
    const url = url_start + 'pypi.json\\';
    console.log('OlddataService.getPypiinfo: url: ' + url);
    return this.http.get(url);
  }

  // --------------------------------------------------------------------------

  getItemtree() {
    const url = url_start + 'items.json\\';
    console.log('OlddataService.getItemtree: url: ' + url);
    return this.http.get(url);
  }

  getItemDetails(itempath: string) {
    //    const url = this.url_start + 'item_detail_json.html?item_path=';
    //    const url = 'http://10.0.0.174:1234/admin/item_detail_json.html?item_path=beoremote';

    const url = url_start + 'item_detail_json.html?item_path=' + itempath;
    console.log('OlddataService.getItemDetails: url: ' + url);
    console.log('OlddataService.getItemDetails: itempath: ' + itempath);
    return this.http.get(url);
  }

  // --------------------------------
  //  Change value of specified item
  //
  changeItemValue(itempath: string, value: string | number | boolean) {
    const url =
      url_start +
      'item_change_value.html?item_path=' +
      itempath +
      '&value=' +
      encodeURIComponent(value);
    console.log('OlddataService.changeItemValue: url: ' + url);
    this.http
      .get(url)
      .pipe(take(1))
      .subscribe(
        (response: unknown) => {
          console.log('updateValue:');
          console.log({ response });
        },
        (error) => {
          console.log('ERROR: OlddataServicechangeItemValue(', { itempath }, ',', { value }, ')');
          console.log(error);
        },
      );
  }

  /*
  // -----------------------------------------------------------
  //  Update config of one plugin in etc/plugin.yaml on backend
  //
  setPluginConfig(pluginsection, config) {
    const configstr = JSON.stringify(config);
    const url = url_start + 'plugin_set_config.html?plugin_section=' + pluginsection + '&config=' + configstr;
    console.warn('setPluginConfig: url: ' + url);
    if (host_ip === 'localhost:4200') {
      alert('setPluginConfig ' + pluginsection + ': Nothing saved, because running on localhost');
    } else {
      this.http.get(url)
        .subscribe(
          (response: unknown[]) => {
            console.log('updateConfig:');
            console.log({response});
          },
          (error) => {
            console.log('ERROR: dataService.setPluginConfig():');
            console.log(error);
          }
        );
    }
  }
*/
}

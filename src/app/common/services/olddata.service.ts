import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class OlddataService {
  private http = inject(HttpClient);

  getSysteminfo() {
    return this.http.get('/admin/systeminfo.json');
  }

  getPypiinfo() {
    return this.http.get('/admin/pypi.json');
  }

  getItemtree() {
    return this.http.get('/admin/items.json');
  }

  getItemDetails(itempath: string) {
    return this.http.get('/admin/item_detail_json.html?item_path=' + itempath);
  }

  changeItemValue(itempath: string, value: string | number | boolean) {
    const url =
      '/admin/item_change_value.html?item_path=' + itempath + '&value=' + encodeURIComponent(value);
    this.http
      .get(url)
      .pipe(take(1))
      .subscribe({
        next: (response: unknown) => {
          console.log('updateValue:');
          console.log({ response });
        },
        error: (error) => {
          console.log('ERROR: OlddataServicechangeItemValue(', { itempath }, ',', { value }, ')');
          console.log(error);
        },
      });
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

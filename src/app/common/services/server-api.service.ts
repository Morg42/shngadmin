
import {Inject, Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';

import {tap, map, catchError} from 'rxjs/operators';
import {of} from 'rxjs';


import {TranslateService } from '@ngx-translate/core';
import {ServerInfo} from '../models/server-info';
import {SharedService} from './shared.service';



let dataUrl = 'http://';
let host_ip = '';

@Injectable({
  providedIn: 'root'
})

export class ServerApiService {

  baseUrl: string;
  shng_serverinfo: ServerInfo = <ServerInfo>{'itemtree_fullpath': true};


  constructor(private http: HttpClient,
              private translate: TranslateService,
              private shared: SharedService,
              @Inject('BASE_URL') baseUrl: string) {

    console.log('ServerApiService.constructor für baseUrl', baseUrl);

    this.baseUrl = baseUrl;
      new URL(baseUrl);
      let apiUrl = '/api/';

    if (host_ip === '') {
      host_ip = location.host;
      dataUrl = baseUrl;
      sessionStorage.setItem('apiUrl', apiUrl);
      console.log('apiUrl = ', apiUrl);
      sessionStorage.setItem('dataUrl', dataUrl);
      console.log('dataUrl =', dataUrl);
      
      sessionStorage.setItem('hostIp', host_ip.split(':')[0]);
      // sessionStorage.setItem('wsPort', '2424');
    } else {
      console.log('host_ip was not empty but ', host_ip);
    }
    const initializedApiUrl = sessionStorage.getItem('apiUrl');
    if (!initializedApiUrl) {
      console.error('Initialisierung abgebrochen: sessionStorage enthält keine gültige API-URL.');
      return;
    }


    this.getServerBasicinfo()
      .subscribe(
        (response: ServerInfo) => {
          this.shng_serverinfo = response;
          // this language will be used as a fallback when a translation isn't found in the current language
          // translate.setDefaultLang(this.shared.getFallbackLanguage());
        },
        (error) => {
          console.warn('DataService: getShngServerinfo():', {error});
        }
      );
  }


  getServerBasicinfo() {
    console.log('ServerApiService.getServerBasicinfo() called');
    const apiUrl = sessionStorage.getItem('apiUrl');
    if (!apiUrl) {
      console.error('sessionStorage has no Item apiUrl');
      return of({});
    }
    let url = apiUrl + 'server/';
    console.log('getServerBasicinfo using url',url);
    return this.http.get(url)
      .pipe(
        tap(response => console.log('response for this.http.get('+String(url)+'): ',response)),
        map(response => {
          console.log('map => response');
          this.shng_serverinfo = response as ServerInfo;
          const result = response as ServerInfo;
          let lang = sessionStorage.getItem('default_language');
          if (lang === null) {
            console.log('default_language from sessionStorage was null');
            sessionStorage.setItem('default_language', this.shng_serverinfo.default_language);
            const fallback = this.shng_serverinfo.fallback_language_order;
            lang = sessionStorage.getItem('default_language');
            this.translate.setDefaultLang(this.shared.getFallbackLanguage());
            console.log('getServerBasicinfo', {lang}, {fallback}, this.shared.getFallbackLanguage());
            this.shared.setGuiLanguage();
          }
          sessionStorage.setItem('client_ip', this.shng_serverinfo.client_ip);
          // sessionStorage.setItem('tz', this.shng_serverinfo.tz);
          // sessionStorage.setItem('tzname', this.shng_serverinfo.tzname);
          // sessionStorage.setItem('itemtree_fullpath', this.shng_serverinfo.itemtree_fullpath.toString());
          // sessionStorage.setItem('itemtree_searchstart', this.shng_serverinfo.itemtree_searchstart.toString());
          // sessionStorage.setItem('core_branch', this.shng_serverinfo.core_branch);
          // sessionStorage.setItem('plugins_branch', this.shng_serverinfo.plugins_branch);
          const hostip = sessionStorage.getItem('hostIp');
          if (hostip === null) {
            console.error('ServerApiService.getServerBasicinfo(): hostip was null');
            return of({});
          } else {
            sessionStorage.setItem('wsHost', hostip);
          }
          // sessionStorage.setItem('wsPort', this.shng_serverinfo.websocket_port);

          this.shared.setGuiLanguage();
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('ServerApiService.getServerBasicinfo(): Could not read serverinfo data' + ' - ' + err?.error?.error || err.message || err);
          return of({});
        })
      );
  }

  getServerinfo() {
    console.log('ServerApiService.getServerinfo() called');
    const apiUrl = sessionStorage.getItem('apiUrl');
    if (apiUrl === null) {
      return;
    }
    // let url = new URL('server/info/',apiUrl).toString();
    let url = apiUrl + 'server/info';
    console.log('ServerApiService.getServerinfo() using url',url);
    return this.http.get(url)
      .pipe(
        tap(response => console.log('ServerApiService.getServerinfo() this.http.get('+String(url)+') results in: ',response)),
        map(response => {
          console.log('ServerApiService.getServerinfo(): enter map(response => ...)');
          this.shng_serverinfo = <ServerInfo> response;
          const result = response;
          let lang = sessionStorage.getItem('default_language');
          const fallback = this.shng_serverinfo.fallback_language_order;
          if (lang === null) {
            sessionStorage.setItem('default_language', this.shng_serverinfo.default_language);
            lang = sessionStorage.getItem('default_language');
          }
          let fallback_language = this.shared.getFallbackLanguage();
          this.translate.setDefaultLang(fallback_language);
          console.log('ServerApiService.getServerinfo() uses lang=', {lang},' and fallback=', {fallback});
          sessionStorage.setItem('client_ip', this.shng_serverinfo.client_ip);
          sessionStorage.setItem('tz', this.shng_serverinfo.tz);
          sessionStorage.setItem('tzname', this.shng_serverinfo.tzname);
          sessionStorage.setItem('tznameST', this.shng_serverinfo.tznameST);
          sessionStorage.setItem('tznameDST', this.shng_serverinfo.tznameDST);
          sessionStorage.setItem('itemtree_fullpath', this.shng_serverinfo.itemtree_fullpath.toString());
          sessionStorage.setItem('itemtree_searchstart', this.shng_serverinfo.itemtree_searchstart.toString());
          sessionStorage.setItem('core_branch', this.shng_serverinfo.core_branch);
          sessionStorage.setItem('plugins_branch', this.shng_serverinfo.plugins_branch);
          sessionStorage.setItem('developer_mode', this.shng_serverinfo.developer_mode.toString());
          sessionStorage.setItem('click_dropdown_header', this.shng_serverinfo.click_dropdown_header.toString());

          sessionStorage.setItem('fallback_language_order', JSON.stringify(this.shng_serverinfo.fallback_language_order.split(',')));
          console.log('most items set in sessionStorage');
          const hostip = sessionStorage.getItem('hostIp');
          if (hostip === null) {
            console.error('ServerApiService.getServerinfo() hostip is null');
          } else {
            sessionStorage.setItem('wsHost', hostip);
          }
          sessionStorage.setItem('wsPort', this.shng_serverinfo.websocket_port);

          this.shared.setGuiLanguage();
          console.log('ServerApiService.getServerinfo(): about to leave map response');
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('ServerApiService.getServerinfo()): Could not read serverinfo data' + ' - ' + err?.error?.error || err.message || err);
          return of({});
        })
      );

  }


  // get Status of shNG software
  getShngServerStatus() {
    console.log('getShngServerStatus')
    const apiUrl = sessionStorage.getItem('apiUrl');
    if (apiUrl === null) {
      console.error('ServerApiService.getShngServerStatus apiUrl is null')
      return;
    }

    let url = new URL('server/status/', apiUrl).toString();
    console.log('ServerApiService.getShngServerStatus ', {url});
    return this.http.get(url)
      .pipe(
        map(response => {
          return response;
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.error.error !== undefined) {
            console.error('ServerApiService (getShngServerStatus): Could not read server status' + ' - ' + err?.error?.error || err.message || err);
//          } else {
//            console.warn('ServerApiService (getShngServerStatus): SmartHomeNG is not running');
          }
          return of({});
        })
      );
  }


  // restart shNG software
  restartShngServer() {
    console.log('restartShngServer')
    const apiUrl = sessionStorage.getItem('apiUrl');
    if (apiUrl === null) {
      console.error('ServerApiService.restartShngServer apiUrl is null');
      return;
    }

    let url = new URL('server/restart/',apiUrl).toString();
    console.log('ServerApiService.restartShngServer ', {url});
    return this.http.put(url, JSON.stringify(''))
      .pipe(
        map(response => {
          return response;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('ServerApiService (RestartShngServer): Could not restart server' + ' - ' + err?.error?.error || err.message || err);
          return of({});
        })
      );
  }


  // Download config files as a zip archive

  downloadConfigBackup() {
    console.log('downloadConfigBackup')
    const apiUrl = sessionStorage.getItem('apiUrl');
    if (apiUrl === null) {
      console.error('ServerApiService.downloadConfigBackup apiUrl is null');
      return;
    }
    let url = new URL('files/backup/',apiUrl).toString();
    console.log('ServerApiService.downloadConfigBackup ', {url});
    return this.http.get(url, {responseType: 'blob'})
      .pipe(
        map(response => {
          return response;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('ServerApiService (downloadConfigBackup): Could not download backup data' + ' - ' + err?.error?.error || err.message || err);
          return of({});
        })
      );
  }

}





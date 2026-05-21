import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class SharedService {
  private translate = inject(TranslateService);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  /** Persists the monitored-item list across item-tree component navigation.
   *  Stored here because WebsocketPluginService is component-scoped. */
  public monitoredItemsList: [string, Record<string, unknown>][] = [];

  constructor() {
    this.log.log('SharedService constructor called');
  }

  ageToString(age: number) {
    const days = Math.trunc(age / (24 * 3600));
    age = age - 24 * 3600 * days;
    const hours = Math.trunc(age / 3600);
    age = age - 3600 * hours;
    const minutes = Math.trunc(age / 60);
    age = age - 60 * minutes;
    let seconds = Math.round(100 * age) / 100;
    if (days !== 0) {
      seconds = Math.round(age);
    }

    let result = '';
    if (days !== 0) {
      result += String(days) + ' ';
      result += days === 1 ? this.translate.instant('DAY') : this.translate.instant('DAYS');
    }
    if (hours !== 0) {
      if (result !== '') {
        result += ', ';
      }
      result += String(hours) + ' ';
      result += hours === 1 ? this.translate.instant('HOUR') : this.translate.instant('HOURS');
    }
    if (minutes !== 0) {
      if (result !== '') {
        result += ', ';
      }
      result += String(minutes) + ' ';
      result +=
        minutes === 1 ? this.translate.instant('MINUTE') : this.translate.instant('MINUTES');
    }
    if (seconds !== 0) {
      if (result !== '') {
        result += ', ';
      }
      result += String(seconds) + ' ';
      result +=
        seconds === 1 ? this.translate.instant('SECOND') : this.translate.instant('SECONDS');
    }
    return result;
  }

  isDST(d: string) {
    const year: number = parseInt(d.split('-')[0]);
    const tzOffset: number = parseInt(d.split('+')[1]);
    const jan = new Date(year, 0, 1).getTimezoneOffset();
    const jul = new Date(year, 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) !== -60 * tzOffset;
  }

  /**
   * Returns a displayable string for a given datetime
   *
   * @param datetime in form of 2025-03-01 10:36:52.201055+02:00
   */
  displayDateTime(datetime: string) {
    if (datetime) {
      const datestring: string = datetime.split(' ')[0];
      const is_dst = this.isDST(datetime);
      const dateparts: string[] = datestring.split('-');
      const date = dateparts[2] + '.' + dateparts[1] + '.' + dateparts[0];
      const time = datetime.split(' ')[1].split('.')[0];
      const tz = is_dst ? this.appConfig.tznameDST : this.appConfig.tzname;
      if (!tz) {
        this.log.warn('SharedService.displayDateTime: tz could not be read from AppConfigService');
      }
      return date + ' ' + time + (tz ? ' ' + tz : '');
    } else {
      return datetime;
    }
  }

  isInt(value: unknown) {
    return /^-{0,1}\d+$/.test(String(value));
  }

  is_knx_groupaddress(groupaddress: string) {
    if (groupaddress === undefined || groupaddress === '') {
      return true;
    }
    const g = groupaddress.split('/');
    if (g.length !== 3) {
      return false;
    }
    if (!(this.isInt(g[0]) && this.isInt(g[1]) && this.isInt(g[2]))) {
      return false;
    }
    if (Number(g[0]) < 0 || Number(g[0]) > 31) {
      return false;
    }
    if (Number(g[1]) < 0 || Number(g[1]) > 7) {
      return false;
    }
    if (Number(g[2]) < 0 || Number(g[2]) > 255) {
      return false;
    }
    return true;
  }

  is_mac(mac: unknown) {
    const macStr = String(mac);
    const MACRegex = new RegExp('^([0-9a-fA-F][0-9a-fA-F]:){5}([0-9a-fA-F][0-9a-fA-F])$');
    return MACRegex.test(macStr);
  }

  is_hostname(str: string) {
    const pattern = new RegExp(
      '^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$',
    );
    return pattern.test(str);
  }

  is_ipv4(ipaddress: string) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ipaddress,
    );
  }

  is_ipv6(value: string) {
    const components: string[] = value.split(':');
    if (components.length < 2 || components.length > 8) {
      return false;
    }
    if (components[0] !== '' || components[1] !== '') {
      if (!components[0].match(/^[\da-f]{1,4}/i)) {
        return false;
      }
    }
    let numberOfZeroCompressions = 0;
    for (let i = 1; i < components.length; ++i) {
      if (components[i] === '') {
        ++numberOfZeroCompressions;
        if (numberOfZeroCompressions > 1) {
          return false;
        }
        continue;
      }
      if (!components[i].match(/^[\da-f]{1,4}/i)) {
        return false;
      }
    }
    return true;
  }

  private zFill(str: string): string {
    return Number(str) < 10 ? '0' + str : str;
  }

  getTimeStamp(timestamp: Date) {
    const date: string[] = [
      String(timestamp.getDate()),
      String(timestamp.getMonth() + 1),
      String(timestamp.getFullYear()),
    ];
    const time: string[] = [
      String(timestamp.getHours()),
      String(timestamp.getMinutes()),
      String(timestamp.getSeconds()),
    ];
    time[1] = this.zFill(time[1]);
    time[2] = this.zFill(time[2]);
    return { date: date.join('.'), time: time.join(':') };
  }

  getBrowser() {
    let ua = navigator.userAgent,
      tem,
      M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
      return { name: 'IE', version: tem[1] || '' };
    }
    if (M[1] === 'Chrome') {
      tem = ua.match(/\bOPR|Edge\/(\d+)/);
      if (tem != null) {
        return { name: 'Opera', version: tem[1] };
      }
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    const vtem = ua.match(/version\/(\d+)/i);
    if (vtem != null) {
      M.splice(1, 1, vtem[1]);
    }
    return { name: M[0], version: M[1] };
  }

  setGuiLanguage() {
    const installed_languages = ['en', 'de', 'fr'];
    const lang = this.appConfig.defaultLanguage;
    if (installed_languages.indexOf(lang) > -1) {
      this.translate.use(lang);
    } else {
      this.log.warn(
        'SharedService.setGuiLanguage',
        'language ' + lang + ' not installed, using en instead',
      );
      this.translate.use(installed_languages[0]);
    }
  }

  getFallbackLanguage(index: number = 0): string {
    const order = this.appConfig.fallbackLanguageOrder;
    if (!order || order.length === 0) {
      this.log.warn(
        'SharedService.getFallbackLanguage: fallbackLanguageOrder is empty, using defaults',
      );
      return ['en', 'de', 'xx'][index] ?? 'en';
    }
    return order[index] ?? 'en';
  }

  getDescription(descriptionDict: Record<string, string> | undefined | null): string {
    if (!descriptionDict) {
      return '';
    }

    const lang = this.appConfig.defaultLanguage;
    let desc = descriptionDict[lang];

    if (!desc) {
      desc = descriptionDict[this.getFallbackLanguage(0)];
    }
    if (!desc) {
      desc = descriptionDict[this.getFallbackLanguage(1)];
    }
    return desc ?? '';
  }
}

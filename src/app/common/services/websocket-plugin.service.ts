import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { APP_NAME, APP_VERSION } from '../../app.component';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';
import { SharedService } from './shared.service';
import { WebsocketService } from './websocket.service';

export interface Message {
  cmd: string;
  id?: string;
  val?: string;
  items?: string[];
  item?: string;
  series?: string;
  start?: string;
  end?: string;
  count?: number;
  sw?: string;
  ver?: string;
  browser?: string;
  bver?: string;
  rawdata: unknown;
}

export type SeriesEntry = [number, number, { date: string; time: string }];

interface SeriesResponse {
  sid: string;
  series: (number | { date: string; time: string })[][];
}

interface SeriesData {
  series: SeriesEntry[];
  tsdiff: number;
}

type SeriesCallback = (series: unknown) => void;

// ------------------------------------------------------------------

@Injectable({
  providedIn: 'root',
})
export class WebsocketPluginService {
  private appConfig = inject(AppConfigService);
  private websocketService = inject(WebsocketService);
  private shared = inject(SharedService);
  private readonly log = inject(LogService);
  monitorCallbackFunction: ((data: unknown) => void) | undefined = undefined;

  private msgMonitorItems: Message = {
    cmd: 'monitor',
    items: [],
    rawdata: null,
  };

  private msgListenSeriesLoad = <Message>{
    cmd: 'series',
    item: 'env.system.load',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 10,
  };
  private msgListenSeriesSystemMemory = <Message>{
    cmd: 'series',
    item: 'env.system.memory.used',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 10,
  };
  private msgListenSeriesSwap = <Message>{
    cmd: 'series',
    item: 'env.system.swap',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 10,
  };
  private msgListenSeriesMemory = <Message>{
    cmd: 'series',
    item: 'env.core.memory',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 10,
  };
  private msgListenSeriesThreads = <Message>{
    cmd: 'series',
    item: 'env.core.threads',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 20,
  };
  private msgListenSeriesWorkerThreads = <Message>{
    cmd: 'series',
    item: 'env.core.scheduler.worker_threads',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 20,
  };
  private msgListenSeriesIdleWorkerThreads = <Message>{
    cmd: 'series',
    item: 'env.core.scheduler.idle_threads',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 20,
  };
  private msgListenSeriesActiveWorkerThreads = <Message>{
    cmd: 'series',
    item: 'env.core.scheduler.active_threads',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 20,
  };
  private msgListenSeriesDisk = <Message>{
    cmd: 'series',
    item: 'env.system.diskusagepercent',
    series: 'avg',
    start: '48h',
    end: 'now',
    count: 10,
  };

  monitor = {
    items: [['x', false]],
    cmd: 'item',
  };

  systemload: SeriesData = { series: [], tsdiff: 0 };
  systemmemory: SeriesData = { series: [], tsdiff: 0 };
  systemswap: SeriesData = { series: [], tsdiff: 0 };
  memory: SeriesData = { series: [], tsdiff: 0 };
  threads: SeriesData = { series: [], tsdiff: 0 };
  workerThreads: SeriesData = { series: [], tsdiff: 0 };
  idleWorkerThreads: SeriesData = { series: [], tsdiff: 0 };
  activeWorkerThreads: SeriesData = { series: [], tsdiff: 0 };
  disk: SeriesData = { series: [], tsdiff: 0 };

  private monitoredItems = new Subject<void>();
  public monitoredItemsUpdate$ = this.monitoredItems.asObservable();

  private systemloadSource = new Subject<void>();
  public systemloadUpdate$ = this.systemloadSource.asObservable();

  private systemmemorySource = new Subject<void>();
  public systemmemoryUpdate$ = this.systemmemorySource.asObservable();

  private systemswapSource = new Subject<void>();
  public systemswapUpdate$ = this.systemswapSource.asObservable();

  private memorySource = new Subject<void>();
  public memoryUpdate$ = this.memorySource.asObservable();

  private threadsSource = new Subject<void>();
  public threadsUpdate$ = this.threadsSource.asObservable();

  private workerThreadsSource = new Subject<void>();
  public workerThreadsUpdate$ = this.workerThreadsSource.asObservable();

  private idleWorkerThreadsSource = new Subject<void>();
  public idleWorkerThreadsUpdate$ = this.idleWorkerThreadsSource.asObservable();

  private activeWorkerThreadsSource = new Subject<void>();
  public activeWorkerThreadsUpdate$ = this.activeWorkerThreadsSource.asObservable();

  private diskSource = new Subject<void>();
  public diskUpdate$ = this.diskSource.asObservable();

  private readonly stop$ = new Subject<void>();

  private msgIdentity = <Message>{
    cmd: 'identity',
    sw: APP_NAME,
    ver: 'v' + APP_VERSION,
    browser: '',
    bver: '',
  };

  connect() {
    const adm_url = 'ws://' + this.appConfig.wsHost + ':' + this.appConfig.wsPort + '/adm';

    if (this.appConfig.hostIp === null) {
      this.log.log(
        { adm_url },
        "Für mockup Environment ip und port in 'testdata/api/server/info/default.json' anpassen",
      );
    }

    this.websocketService.connect(adm_url);

    this.websocketService.messages$.pipe(takeUntil(this.stop$)).subscribe({
      next: (msg) => {
        let data: Message;
        try {
          data = JSON.parse(msg.data);
        } catch (e) {
          this.log.warn('WebsocketPluginService: failed to parse message', msg.data, e);
          return;
        }
        if (data.cmd === 'item') {
          this.handleResponseItem(data);
        } else if (data.cmd === 'series') {
          this.handleResponseSeries(data as unknown as SeriesResponse);
        } else {
          this.log.log('message received:', data);
        }
      },
      error: (err) => this.log.log(err),
    });

    // Send identity on every (re)connect
    this.websocketService.open$.pipe(takeUntil(this.stop$)).subscribe(() => {
      const browser = this.shared.getBrowser();
      this.websocketService.sendMessage({
        ...this.msgIdentity,
        browser: browser.name,
        bver: browser.version,
      });
    });
  }

  disconnect() {
    this.stop$.next();
    this.websocketService.close();
  }

  handleResponseItem(data: Message) {
    if (this.monitorCallbackFunction) {
      this.monitorCallbackFunction(data);
    }
    this.monitoredItems.next();
  }

  sendMessage(message: unknown) {
    this.websocketService.sendMessage(message);
  }

  // ------------------------------------------------------------------
  // requests monitoring of items
  //

  getMonitoredItems(itemList: [string, unknown][] = [], callback: (data: unknown) => void) {
    this.monitorCallbackFunction = callback;
    this.sendMessage({
      ...this.msgMonitorItems,
      items: itemList.map((item) => item[0]),
    });
  }

  // ------------------------------------------------------------------
  // requests series for load, memory and threads
  //

  getSeriesLoad(period = '24h', count = 100) {
    this.sendMessage({ ...this.msgListenSeriesLoad, start: period, count });
  }

  getSeriesSystemMemory(period = '24h', count = 100) {
    this.sendMessage({ ...this.msgListenSeriesSystemMemory, start: period, count });
  }

  getSeriesSwap(period = '24h', count = 100) {
    this.sendMessage({ ...this.msgListenSeriesSwap, start: period, count });
  }

  getSeriesMemory(period = '24h', count = 100) {
    this.sendMessage({ ...this.msgListenSeriesMemory, start: period, count });
  }

  getSeriesThreads(period = '24h', count = 100) {
    this.sendMessage({ ...this.msgListenSeriesThreads, start: period, count });
  }

  getSeriesWorkerThreads(period = '24h', count = 100) {
    this.sendMessage({ ...this.msgListenSeriesWorkerThreads, start: period, count });
    this.sendMessage({ ...this.msgListenSeriesIdleWorkerThreads, start: period, count });
  }

  getSeriesDisk(period = '24h', count = 100) {
    this.sendMessage({ ...this.msgListenSeriesDisk, start: period, count });
  }

  // ------------------------------------------------------------------
  // Handle responses to series requests
  //

  convertTimestamps(data: SeriesResponse) {
    for (let i = 0; i < data.series.length; i++) {
      data.series[i].push(this.shared.getTimeStamp(new Date(data.series[i][0] as number)));
    }
  }

  convertMemorysize(data: SeriesResponse) {
    for (let i = 0; i < data.series.length; i++) {
      data.series[i][1] = (data.series[i][1] as number) / 1000 / 1000;
    }
  }

  updateSeries(graphdata: SeriesData, data: SeriesResponse) {
    if (graphdata.series.length === 0) {
      const tstampDiff =
        (data.series[data.series.length - 1][0] as number) - (data.series[0][0] as number);
      graphdata.tsdiff = tstampDiff;
    } else if (graphdata.series.length > 1) {
      const tstampOldest = new Date().getTime() - graphdata.tsdiff;
      while (graphdata.series.length > 1 && graphdata.series[1][0] < tstampOldest) {
        graphdata.series.shift();
      }
      graphdata.series[0][0] = tstampOldest;
    }
    graphdata.series.push(...(data.series as SeriesEntry[]));
  }

  handleResponseSeries(data: SeriesResponse) {
    if (data.sid.startsWith(this.msgListenSeriesMemory.item!)) {
      this.convertMemorysize(data);
    }
    if (data.sid.startsWith(this.msgListenSeriesSystemMemory.item!)) {
      this.convertMemorysize(data);
    }
    if (data.sid.startsWith(this.msgListenSeriesSwap.item!)) {
      this.convertMemorysize(data);
    }
    this.convertTimestamps(data);

    if (data.sid.startsWith(this.msgListenSeriesLoad.item!)) {
      this.updateSeries(this.systemload, data);
      this.systemloadSource.next();
    } else if (data.sid.startsWith(this.msgListenSeriesSystemMemory.item!)) {
      this.updateSeries(this.systemmemory, data);
      this.systemmemorySource.next();
    } else if (data.sid.startsWith(this.msgListenSeriesSwap.item!)) {
      this.updateSeries(this.systemswap, data);
      this.systemswapSource.next();
    } else if (data.sid.startsWith(this.msgListenSeriesMemory.item!)) {
      this.updateSeries(this.memory, data);
      this.memorySource.next();
    } else if (data.sid.startsWith(this.msgListenSeriesThreads.item!)) {
      this.updateSeries(this.threads, data);
      this.threadsSource.next();
    } else if (data.sid.startsWith(this.msgListenSeriesWorkerThreads.item!)) {
      this.updateSeries(this.workerThreads, data);
      this.workerThreadsSource.next();
    } else if (data.sid.startsWith(this.msgListenSeriesIdleWorkerThreads.item!)) {
      this.updateSeries(this.idleWorkerThreads, data);
      this.idleWorkerThreadsSource.next();
    } else if (data.sid.startsWith(this.msgListenSeriesActiveWorkerThreads.item!)) {
      this.updateSeries(this.activeWorkerThreads, data);
      this.activeWorkerThreadsSource.next();
    } else if (data.sid.startsWith(this.msgListenSeriesDisk.item!)) {
      this.updateSeries(this.disk, data);
      this.diskSource.next();
    } else {
      this.log.warn('message received (UNKNOWN series):', data);
    }
  }
}

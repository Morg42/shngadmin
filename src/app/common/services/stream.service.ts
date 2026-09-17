import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';
import { SharedService } from './shared.service';

export type SeriesEntry = [number, number, { date: string; time: string }];

interface SeriesData {
  series: SeriesEntry[];
  tsdiff: number;
}

interface StreamConnectionEvent {
  connectionId: string;
}

interface StreamItemEvent {
  type: 'item';
  path: string;
  value: unknown;
  last_change: string;
  last_change_by: string;
  last_update: string;
  last_update_by: string;
  last_value: unknown;
}

interface StreamSeriesEvent {
  type: 'series';
  sid: string;
  series: SeriesEntry[];
}

interface SeriesSubscription {
  sid: string;
  item: string;
  series: string;
  start: string;
  end: string;
  count: number;
}

type SeriesKey =
  | 'load'
  | 'systemMemory'
  | 'swap'
  | 'memory'
  | 'threads'
  | 'workerThreads'
  | 'idleWorkerThreads'
  | 'activeWorkerThreads'
  | 'disk';

/**
 * Replaces the legacy websocket /adm push protocol (item value monitor,
 * system-overview series) with the SSE-based GET/PATCH /api/stream backend
 * (modules/admin/api_stream.py). Public API mirrors the previous
 * WebsocketPluginService 1:1 so ItemTreeComponent/SystemComponent needed
 * no internal changes, only the injected service.
 */
@Injectable({
  providedIn: 'root',
})
export class StreamService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private shared = inject(SharedService);
  private readonly log = inject(LogService);

  monitorCallbackFunction: ((data: unknown) => void) | undefined = undefined;

  private eventSource: EventSource | null = null;
  private connectionId: string | null = null;
  private stopped = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private readonly BACKOFF_SECONDS = [2, 4, 8, 16, 30];

  private monitoredItems = new Set<string>();
  private seriesSubscriptions = new Map<string, SeriesSubscription>();

  private readonly seriesItemPaths: Record<SeriesKey, string> = {
    load: 'env.system.load',
    systemMemory: 'env.system.memory.used',
    swap: 'env.system.swap',
    memory: 'env.core.memory',
    threads: 'env.core.threads',
    workerThreads: 'env.core.scheduler.worker_threads',
    idleWorkerThreads: 'env.core.scheduler.idle_threads',
    activeWorkerThreads: 'env.core.scheduler.active_threads',
    disk: 'env.system.diskusagepercent',
  };

  // Each incoming series message publishes a NEW SeriesData value (updateSeries is copy-based) via signal.set().
  readonly systemload = signal<SeriesData>({ series: [], tsdiff: 0 });
  readonly systemmemory = signal<SeriesData>({ series: [], tsdiff: 0 });
  readonly systemswap = signal<SeriesData>({ series: [], tsdiff: 0 });
  readonly memory = signal<SeriesData>({ series: [], tsdiff: 0 });
  readonly threads = signal<SeriesData>({ series: [], tsdiff: 0 });
  readonly workerThreads = signal<SeriesData>({ series: [], tsdiff: 0 });
  readonly idleWorkerThreads = signal<SeriesData>({ series: [], tsdiff: 0 });
  readonly activeWorkerThreads = signal<SeriesData>({ series: [], tsdiff: 0 });
  readonly disk = signal<SeriesData>({ series: [], tsdiff: 0 });

  connect() {
    this.stopped = false;
    this.reconnectAttempt = 0;
    this.openStream();
  }

  disconnect() {
    this.stopped = true;
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    this.eventSource?.close();
    this.eventSource = null;
    this.connectionId = null;
  }

  // Connection lifecycle

  private openStream() {
    if (!this.appConfig.apiUrl) {
      this.log.warn('StreamService.openStream(): apiUrl not yet available — skipping connect');
      return;
    }

    this.http.get<{ token: string }>(this.appConfig.apiUrl + 'stream/token').subscribe({
      next: ({ token }) => this.openEventSource(token),
      error: (err) => {
        this.log.warn('StreamService: failed to mint stream token', err);
        this.scheduleReconnect();
      },
    });
  }

  private openEventSource(token: string) {
    if (this.stopped) return;

    // trailing slash avoids CherryPy's redirect for the bare object route (see api_items.py's 'items/list/')
    const url = this.appConfig.apiUrl + 'stream/?token=' + encodeURIComponent(token);
    const es = new EventSource(url);
    this.eventSource = es;

    es.addEventListener('connection', (event: MessageEvent) => {
      this.reconnectAttempt = 0;
      const data = JSON.parse(event.data) as StreamConnectionEvent;
      this.connectionId = data.connectionId;
      this.resyncSubscriptions();
    });

    es.addEventListener('item', (event: MessageEvent) => {
      const data = JSON.parse(event.data) as StreamItemEvent;
      this.handleResponseItem(data);
    });

    es.addEventListener('series', (event: MessageEvent) => {
      const data = JSON.parse(event.data) as StreamSeriesEvent;
      this.handleResponseSeries(data);
    });

    es.onerror = () => {
      if (this.stopped) return;
      es.close();
      if (this.eventSource === es) this.eventSource = null;
      this.connectionId = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    const delay =
      this.BACKOFF_SECONDS[Math.min(this.reconnectAttempt, this.BACKOFF_SECONDS.length - 1)];
    this.reconnectAttempt++;
    this.log.log(`Stream closed, reconnecting in ${delay}s...`);
    this.reconnectTimer = setTimeout(() => this.openStream(), delay * 1000);
  }

  /** A fresh connectionId means the backend has zero subscriptions - resend
   *  the full current state rather than tracking deltas across reconnects. */
  private resyncSubscriptions() {
    const addItems = [...this.monitoredItems];
    const addSeries = [...this.seriesSubscriptions.values()];
    if (addItems.length || addSeries.length) {
      this.patchSubscriptions({ addItems, addSeries });
    }
  }

  private patchSubscriptions(patch: {
    addItems?: string[];
    removeItems?: string[];
    addSeries?: SeriesSubscription[];
    removeSeries?: string[];
  }) {
    if (!this.connectionId) return;
    this.http
      .patch<{
        result: string;
        description?: string;
      }>(this.appConfig.apiUrl + 'stream/' + encodeURIComponent(this.connectionId), patch)
      .subscribe({
        // bare-resource PATCH returns errors as 200 {result:'error'}, not a real status - see rest.py
        next: (response) => {
          if (response?.result === 'error') {
            this.log.warn('StreamService: subscription patch failed', response.description);
          }
        },
        error: (err) => this.log.warn('StreamService: subscription patch failed', err),
      });
  }

  // requests monitoring of items

  getMonitoredItems(itemList: [string, unknown][] = [], callback: (data: unknown) => void) {
    this.monitorCallbackFunction = callback;
    const nextItems = new Set(itemList.map((item) => item[0] as string));
    const addItems = [...nextItems].filter((path) => !this.monitoredItems.has(path));
    const removeItems = [...this.monitoredItems].filter((path) => !nextItems.has(path));
    this.monitoredItems = nextItems;
    if (addItems.length || removeItems.length) {
      this.patchSubscriptions({ addItems, removeItems });
    }
  }

  private handleResponseItem(data: StreamItemEvent) {
    if (!this.monitorCallbackFunction) return;
    this.monitorCallbackFunction({
      items: [
        [
          data.path,
          {
            value: data.value,
            last_change: data.last_change,
            last_change_by: data.last_change_by,
            last_update: data.last_update,
            last_update_by: data.last_update_by,
            last_value: data.last_value,
          },
        ],
      ],
    });
  }

  // requests series for load, memory and threads

  private setSeries(key: SeriesKey, period: string, count: number) {
    const item = this.seriesItemPaths[key];
    const subscription: SeriesSubscription = {
      sid: item,
      item,
      series: 'avg',
      start: period,
      end: 'now',
      count,
    };
    this.seriesSubscriptions.set(item, subscription);
    this.patchSubscriptions({ addSeries: [subscription] });
  }

  getSeriesLoad(period = '24h', count = 100) {
    this.setSeries('load', period, count);
  }

  getSeriesSystemMemory(period = '24h', count = 100) {
    this.setSeries('systemMemory', period, count);
  }

  getSeriesSwap(period = '24h', count = 100) {
    this.setSeries('swap', period, count);
  }

  getSeriesMemory(period = '24h', count = 100) {
    this.setSeries('memory', period, count);
  }

  getSeriesThreads(period = '24h', count = 100) {
    this.setSeries('threads', period, count);
  }

  getSeriesWorkerThreads(period = '24h', count = 100) {
    this.setSeries('workerThreads', period, count);
    this.setSeries('idleWorkerThreads', period, count);
  }

  getSeriesDisk(period = '24h', count = 100) {
    this.setSeries('disk', period, count);
  }

  // Handle responses to series requests

  private convertTimestamps(series: SeriesEntry[]) {
    for (const entry of series) {
      entry[2] = this.shared.getTimeStamp(new Date(entry[0]));
    }
  }

  private convertMemorysize(series: SeriesEntry[]) {
    for (const entry of series) {
      entry[1] = entry[1] / 1000 / 1000;
    }
  }

  /** Produces a NEW SeriesData from the previous one plus the incoming
   *  response - same trimming semantics as the old in-place version, but
   *  copy-based so it can be published on a signal. */
  private updateSeries(prev: SeriesData, incoming: SeriesEntry[]): SeriesData {
    let tsdiff = prev.tsdiff;
    const series = [...prev.series];
    if (series.length === 0) {
      tsdiff = incoming[incoming.length - 1][0] - incoming[0][0];
    } else if (series.length > 1) {
      const tstampOldest = new Date().getTime() - tsdiff;
      while (series.length > 1 && series[1][0] < tstampOldest) {
        series.shift();
      }
      series[0] = [tstampOldest, series[0][1], this.shared.getTimeStamp(new Date(tstampOldest))];
    }
    series.push(...incoming);
    return { series, tsdiff };
  }

  private readonly memorySizeSeries: ReadonlySet<string> = new Set([
    this.seriesItemPaths.memory,
    this.seriesItemPaths.systemMemory,
    this.seriesItemPaths.swap,
  ]);

  private handleResponseSeries(data: StreamSeriesEvent) {
    const series = data.series;
    if (this.memorySizeSeries.has(data.sid)) {
      this.convertMemorysize(series);
    }
    this.convertTimestamps(series);

    const targetSignal = this.seriesSignalFor(data.sid);
    if (targetSignal) {
      targetSignal.update((prev) => this.updateSeries(prev, series));
    } else {
      this.log.warn('message received (UNKNOWN series):', data);
    }
  }

  private seriesSignalFor(sid: string) {
    switch (sid) {
      case this.seriesItemPaths.load:
        return this.systemload;
      case this.seriesItemPaths.systemMemory:
        return this.systemmemory;
      case this.seriesItemPaths.swap:
        return this.systemswap;
      case this.seriesItemPaths.memory:
        return this.memory;
      case this.seriesItemPaths.threads:
        return this.threads;
      case this.seriesItemPaths.workerThreads:
        return this.workerThreads;
      case this.seriesItemPaths.idleWorkerThreads:
        return this.idleWorkerThreads;
      case this.seriesItemPaths.activeWorkerThreads:
        return this.activeWorkerThreads;
      case this.seriesItemPaths.disk:
        return this.disk;
      default:
        return undefined;
    }
  }
}

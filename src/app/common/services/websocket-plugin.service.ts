
import { Injectable, OnInit } from '@angular/core';

import { Subject, Observable, Observer } from 'rxjs';
import { map } from 'rxjs/operators';
import { webSocket } from 'rxjs/webSocket'; // for RxJS 6, for v5 use Observable.webSocket

// import { SystemComponent } from '../system/system.component';

import { AppComponent } from '../../app.component';
import { WebsocketService } from './websocket.service';
import { AppConfigService } from './app-config.service';
import { SharedService } from './shared.service';
import {OlddataService} from './olddata.service';



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
  rawdata: any;
}


type SeriesCallback = ( series: any ) => void;


// ------------------------------------------------------------------

@Injectable({
  providedIn: 'root'
})

// @Injectable()
export class WebsocketPluginService implements OnInit {
  public messages: Subject<Message>;

  wsService: any;
  subject: any;

  monitorCallbackFunction = undefined;

  private msgMonitorItems = <Message> {
    'cmd': 'monitor',
    'items': []
  };

  private msgListenSeriesLoad = <Message> {
    'cmd': 'series',
    'item': 'env.system.load',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 10
  };
  private msgListenSeriesSystemMemory = <Message> {
    'cmd': 'series',
    'item': 'env.system.memory.used',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 10
  };
  private msgListenSeriesSwap = <Message> {
    'cmd': 'series',
    'item': 'env.system.swap',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 10
  };
  private msgListenSeriesMemory = <Message> {
    'cmd': 'series',
    'item': 'env.core.memory',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 10
  };
  private msgListenSeriesThreads = <Message> {
    'cmd': 'series',
    'item': 'env.core.threads',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 20
  };
  private msgListenSeriesWorkerThreads = <Message> {
    'cmd': 'series',
    'item': 'env.core.scheduler.worker_threads',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 20
  };
  private msgListenSeriesIdleWorkerThreads = <Message> {
    'cmd': 'series',
    'item': 'env.core.scheduler.idle_threads',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 20
  };
  private msgListenSeriesActiveWorkerThreads = <Message> {
    'cmd': 'series',
    'item': 'env.core.scheduler.active_threads',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 20
  };
  private msgListenSeriesDisk = <Message> {
    'cmd': 'series',
    'item': 'env.system.diskusagepercent',
    'series': 'avg',
    'start': '48h',
    'end': 'now',
    'count': 10
  };


  monitor = {
    'items': [['x', false]],
    'cmd': 'item'
  };


  systemload = {
    'series': [],
    'tsdiff': 0,
  };

  systemmemory = {
    'series': [],
    'tsdiff': 0,
  };

  systemswap = {
    'series': [],
    'tsdiff': 0,
  };

  memory = {
    'series': [],
    'tsdiff': 0,
  };

  threads = {
    'series': [],
    'tsdiff': 0,
  };

  workerThreads = {
    'series': [],
    'tsdiff': 0,
  };

  idleWorkerThreads = {
    'series': [],
    'tsdiff': 0,
  };

  activeWorkerThreads = {
    'series': [],
    'tsdiff': 0,
  };

  disk = {
    'series': [],
    'tsdiff': 0,
  };


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


  constructor(private appConfig: AppConfigService,
              private dataService: OlddataService,
              private websocketService: WebsocketService,
              private shared: SharedService,
              private app: AppComponent) {
  }

  firstMsgSent = false;
  msgIdentity = <Message> {
    cmd: 'identity',
    sw: this.app.APP_NAME,
    ver: 'v' + this.app.APP_VERSION,
    browser: 'y',
    bver: ''
  };


  ngOnInit() {
  }

/*
  async delay(ms: number, msg: string) {
    await new Promise(resolve => setTimeout(() => resolve(), ms)).then( () => {
//      console.log('fired ' + msg)
    });
  }
*/

  async delay(ms: number, msg: string) {
    await new Promise(resolve => setTimeout(resolve, ms));
    // console.log('fired ' + msg);
  }


  connect() {
    const wsHost = this.appConfig.wsHost;
    const wsPort = this.appConfig.wsPort;
    const hostIp = this.appConfig.hostIp;
    const adm_url = 'ws://' + wsHost + ':' + wsPort + '/adm';

    if (hostIp === null) {
      console.log({adm_url}, 'Für mockup Environment ip und port in \'testdata/api/server/info/default.json\' anpassen');
    }
    this.wsService = new WebsocketService();
    this.subject = this.wsService.connect(adm_url);
    this.subject.subscribe(msg => {
        console.warn('connect', msg.data);
        const data = JSON.parse(msg.data);
        if (data.cmd === 'item') {
          this.handleResponseItem(data);
        } else if (data.cmd === 'series') {
          this.handleResponseSeries(data);
        } else {
          console.log('message received :');
          console.log(data);
        }
      },
      (err) => console.log(err),
    );

    if (this.firstMsgSent) {
      this.wsService.sendMessage(this.msgIdentity);
    } else {
      this.delay(500, 'msgIdentity').then(any => {
        const browser = this.shared.getBrowser();
        this.msgIdentity.browser = browser.name;
        this.msgIdentity.bver = browser.version;
        // task after delay.
        this.wsService.sendMessage(this.msgIdentity);
        this.firstMsgSent = true;
      });
    }
  }


  disconnect() {
    this.subject.unsubscribe();
    this.wsService.close();
  }


  handleResponseItem(data) {
    // console.log('message received (item):');
    // console.log(data);
    this.monitorCallbackFunction(data);
  }


  sendMessage(message: any) {
    if (this.firstMsgSent) {
      this.wsService.sendMessage(message);
    } else {
      this.delay(500, message.item).then(any => {
        // task after delay.
        this.wsService.sendMessage(message);
      });
    }
  }



  // ------------------------------------------------------------------
  // requests monitorig of items
  //

  getMonitoredItems(itemList = [], callback) {
    this.monitorCallbackFunction = callback;

    const monitorItems = [];
    for (let i = 0; i < itemList.length; i++) {
      monitorItems.push(itemList[i][0]);
    }
    this.msgMonitorItems.items = monitorItems;
    this.sendMessage(this.msgMonitorItems);
  }


  // ------------------------------------------------------------------
  // requests series for load, memory and threads
  //

  getSeriesLoad(period = '24h', count = 100) {
    this.msgListenSeriesLoad.start = period;
    this.msgListenSeriesLoad.count = count;
    this.sendMessage(this.msgListenSeriesLoad);
  }

  getSeriesSystemMemory(period = '24h', count = 100) {
    this.msgListenSeriesSystemMemory.start = period;
    this.msgListenSeriesSystemMemory.count = count;
    this.sendMessage(this.msgListenSeriesSystemMemory);
  }

  getSeriesSwap(period = '24h', count = 100) {
    this.msgListenSeriesSwap.start = period;
    this.msgListenSeriesSwap.count = count;
    this.sendMessage(this.msgListenSeriesSwap);
  }


  getSeriesMemory(period = '24h', count = 100) {
    this.msgListenSeriesMemory.start = period;
    this.msgListenSeriesMemory.count = count;
    this.sendMessage(this.msgListenSeriesMemory);
  }


  getSeriesThreads(period = '24h', count = 100) {
    this.msgListenSeriesThreads.start = period;
    this.msgListenSeriesThreads.count = count;
    this.sendMessage(this.msgListenSeriesThreads);
  }


  getSeriesWorkerThreads(period = '24h', count = 100) {
    this.msgListenSeriesWorkerThreads.start = period;
    this.msgListenSeriesWorkerThreads.count = count;
    this.sendMessage(this.msgListenSeriesWorkerThreads);

    this.msgListenSeriesIdleWorkerThreads.start = period;
    this.msgListenSeriesIdleWorkerThreads.count = count;
    this.sendMessage(this.msgListenSeriesIdleWorkerThreads);
  }

  getSeriesDisk(period = '24h', count = 100) {
    // this.msgListenSeriesDisk.item = 'env.system.diskfree';
    this.msgListenSeriesDisk.start = period;
    this.msgListenSeriesDisk.count = count;
    this.sendMessage(this.msgListenSeriesDisk);
  }


  // ------------------------------------------------------------------
  // Handle responses to series requests
  //

  convertTimestamps(data) {
    // for each value pair: Create a string value for each timpestamp and append it to the array
    for (let i = 0; i < data.series.length; i++) {
      data.series[i].push(this.shared.getTimeStamp(new Date(data.series[i][0])));
      // console.log(data.series[i]);
    }
  }


  convertMemorysize(data) {
    // for each value pair: Create a string value for each timpestamp and append it to the array
    for (let i = 0; i < data.series.length; i++) {
      data.series[i][1] = data.series[i][1] / 1000 / 1000;
    }
  }


  updateSeries(graphdata, data) {
    if (graphdata.series.length === 0) {
      // calculate the difference between oldest and newest timestamp
      const tstampDiff = data.series[data.series.length - 1][0] - data.series[0][0];
      graphdata.tsdiff = tstampDiff;
    } else {
      const tstampNow = new Date().getTime();
      // calculate oldest valid timestamp
      const tstampOldest = tstampNow - graphdata.tsdiff;

      // remove value pairs that are older then the oldest valid timestamp
//      console.log('Remove old value-pairs:');
//      console.log(graphdata);
      // leave one value that is older than oldest valid timestamp
      let tmp = tstampOldest - graphdata.series[1][0];
      while (graphdata.series[1][0] < tstampOldest) {
        graphdata.series.shift();
        tmp = tstampOldest - graphdata.series[1][0];
      }
      graphdata.series[0][0] = tstampOldest;
//      console.log(graphdata);
    }

    // append value pairs to existing series of data
    graphdata.series.push.apply(graphdata.series, data.series);
    return;
  }


  handleResponseSeries(data) {
//    console.warn('handleResponseSeries');
//    console.log(data);
    if (data.sid.startsWith(this.msgListenSeriesMemory.item)) {
      this.convertMemorysize(data);
    }
    if (data.sid.startsWith(this.msgListenSeriesSystemMemory.item)) {
      this.convertMemorysize(data);
    }
    if (data.sid.startsWith(this.msgListenSeriesSwap.item)) {
      this.convertMemorysize(data);
    }
    this.convertTimestamps(data);
    if (data.sid.startsWith(this.msgListenSeriesLoad.item)) {
      // console.log('message received (load-series):');
      this.updateSeries(this.systemload, data);
      this.systemloadSource.next();

    } else if (data.sid.startsWith(this.msgListenSeriesSystemMemory.item)) {
      // console.log('message received (memory-series):');
      this.updateSeries(this.systemmemory, data);
      this.systemmemorySource.next();

    } else if (data.sid.startsWith(this.msgListenSeriesSwap.item)) {
      // console.log('message received (memory-series):');
      this.updateSeries(this.systemswap, data);
      this.systemswapSource.next();

    } else if (data.sid.startsWith(this.msgListenSeriesMemory.item)) {
      // console.log('message received (memory-series):');
      this.updateSeries(this.memory, data);
      this.memorySource.next();

    } else if (data.sid.startsWith(this.msgListenSeriesThreads.item)) {
      // console.log('message received (threads-series):');
      this.updateSeries(this.threads, data);
      this.threadsSource.next();

    } else if (data.sid.startsWith(this.msgListenSeriesWorkerThreads.item)) {
      // console.log('message received (workerThreads-series):');
      this.updateSeries(this.workerThreads, data);
      this.workerThreadsSource.next();

    } else if (data.sid.startsWith(this.msgListenSeriesIdleWorkerThreads.item)) {
      // console.log('message received (idleWorkerThreads-series):');
      this.updateSeries(this.idleWorkerThreads, data);
      this.idleWorkerThreadsSource.next();

    } else if (data.sid.startsWith(this.msgListenSeriesActiveWorkerThreads.item)) {
      // console.log('message received (activeWorkerThreads-series):');
      this.updateSeries(this.activeWorkerThreads, data);
      this.activeWorkerThreadsSource.next();

    } else if (data.sid.startsWith(this.msgListenSeriesDisk.item)) {
      // console.log('message received (disk-series):');
      this.updateSeries(this.disk, data);
      this.diskSource.next();

    } else {
      console.warn('message received (UNKNOWN series):');
      console.log(data);
     }
  }

}


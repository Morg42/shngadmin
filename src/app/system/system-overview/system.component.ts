import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from '../../common/services/app-config.service';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ChartData } from 'chart.js';
import { Subject, timer } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';

import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { Bind } from 'primeng/bind';
import { UIChart } from 'primeng/chart';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Ripple } from 'primeng/ripple';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { APP_NAME, APP_VERSION, APP_VERSION_DETAIL, APP_VERSION_REF } from '../../app.component';
import { PypiInfo } from '../../common/models/pypi-info';
import { SystemInfo } from '../../common/models/system-info';
import { LogService } from '../../common/services/log.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { SharedService } from '../../common/services/shared.service';
import { WebsocketPluginService } from '../../common/services/websocket-plugin.service';
import { WebsocketService } from '../../common/services/websocket.service';

@Component({
  selector: 'app-system',
  templateUrl: './system.component.html',
  styleUrls: ['./system.component.css'],
  providers: [WebsocketService, WebsocketPluginService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Tabs,
    TabList,
    Ripple,
    Tab,
    TabPanels,
    TabPanel,
    NgOptimizedImage,
    UIChart,
    DecimalPipe,
    TranslatePipe,
    ProgressSpinner,
  ],
})
export class SystemComponent implements OnDestroy, OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  private serverApi = inject(ServerApiService);
  private translate = inject(TranslateService);
  private websocketPluginService = inject(WebsocketPluginService);
  public shared = inject(SharedService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  faCheckCircle = faCheckCircle;

  readonly loading = signal(true);
  readonly licenseText = signal('');
  readonly pypiPending = signal(false);
  private readonly pypiPollStop$ = new Subject<void>();

  readonly systeminfo = signal<SystemInfo>(<SystemInfo>{});
  readonly pypiinfo = signal<PypiInfo[]>([]);
  reqinfodisplay!: Record<string, string>;
  readonly plugincount = signal(0);
  readonly documentationcount = signal(0);
  readonly testsuitecount = signal(0);
  readonly norequirementcount = signal(0);

  readonly os_uptime = signal('');
  readonly sh_uptime = signal('');

  chartoptions1: Record<string, unknown> = { scales: { x: {}, y: {} } };
  chartoptionsSystem: Record<string, unknown> = {
    plugins: { title: { display: true, text: 'System' } },
    scales: { x: {}, y: {} },
  };
  chartoptionsShng: Record<string, unknown> = {
    plugins: { title: { display: true, text: 'SmartHomeNG' } },
    scales: { x: {}, y: { min: 0 } },
  };
  chartoptionsScheduler: Record<string, unknown> = {
    plugins: { title: { display: true, text: 'SmartHomeNG Scheduler' } },
    scales: { x: {}, y: { min: 0 } },
  };
  chartoptionsDisc: Record<string, unknown> = {
    plugins: { title: { display: true, text: 'Disc' } },
    scales: { x: {}, y: {} },
  };

  private static emptyDataset(label: string): ChartData {
    return {
      labels: [],
      datasets: [
        {
          label,
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };
  }
  private static emptyDataset2(label1: string, label2: string): ChartData {
    return {
      labels: [],
      datasets: [
        {
          label: label1,
          data: [],
          fill: false,
          backgroundColor: '#ff8000',
          borderColor: '#ff8000',
          pointRadius: 0,
        },
        {
          label: label2,
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };
  }

  readonly chartdataLoad = computed(() =>
    this.updateChartData(
      SystemComponent.emptyDataset('Load'),
      this.websocketPluginService.systemload().series,
    ),
  );
  readonly chartdataSystemMemory = computed(() =>
    this.updateChartData(
      SystemComponent.emptyDataset('Memory (MByte)'),
      this.websocketPluginService.systemmemory().series,
    ),
  );
  readonly chartdataSwap = computed(() =>
    this.updateChartData(
      SystemComponent.emptyDataset('Swap used (MByte)'),
      this.websocketPluginService.systemswap().series,
    ),
  );
  readonly chartdataMemory = computed(() =>
    this.updateChartData(
      SystemComponent.emptyDataset('Memory (MByte)'),
      this.websocketPluginService.memory().series,
    ),
  );
  readonly chartdataThreads = computed(() =>
    this.updateChartData(
      SystemComponent.emptyDataset('Threads'),
      this.websocketPluginService.threads().series,
    ),
  );
  /** Two source signals, one chart - the old combineLatest becomes a plain
   *  computed reading both. Active workers = started minus idle. */
  readonly chartdataWorkerThreads = computed(() => {
    const workerSeries = this.websocketPluginService.workerThreads().series;
    const idleSeries = this.websocketPluginService.idleWorkerThreads().series;
    const len = Math.min(workerSeries.length, idleSeries.length);
    const activeSeries: [number, number, { time: string }][] = [];
    for (let i = 0; i < len; i++) {
      activeSeries.push([
        workerSeries[i][0],
        workerSeries[i][1] - idleSeries[i][1],
        workerSeries[i][2],
      ]);
    }
    return this.updateChartData(
      SystemComponent.emptyDataset2('Started Workers', 'Active Workers'),
      workerSeries.slice(0, len),
      activeSeries,
    );
  });
  readonly chartdataDisk = computed(() =>
    this.updateChartData(
      SystemComponent.emptyDataset('% disc usage'),
      this.websocketPluginService.disk().series,
    ),
  );

  appName = APP_NAME;
  appVersion = 'v' + APP_VERSION; // short form used in page titles / navbar
  appVersionDetail = APP_VERSION_DETAIL; // v{semver}-{commit}.{branch}
  appVersionRef = APP_VERSION_REF; // (heads/branch)

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('SystemComponent.ngOnInit:');

    this.setTitle(this.translate.instant('MENU.SYSTEM_PROPERTIES'));
    this.initSystemInfo();
  }

  ngOnDestroy(): void {
    this.websocketPluginService.disconnect();
    this.pypiPollStop$.complete();
  }

  initSystemInfo() {
    // ---------------------------------------------
    // Initialize system info
    //
    this.serverApi
      .getSystemStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const info = response as SystemInfo;
          this.systeminfo.set(info);
          this.os_uptime.set(this.shared.ageToString(info.uptime));
          this.sh_uptime.set(this.shared.ageToString(info.sh_uptime));
        },
        error: (error) => {
          this.log.log('SystemComponent: serverApi.getSystemStats():');
          this.log.log(error);
        },
      });

    // PyPI data is fetched on demand when the user opens the PyPI tab.

    // -----------------------------------
    // Initialize info for the graph-tab
    //
    this.initCharts();

    this.http
      .get('assets/3rdpartylicenses.txt', { responseType: 'text' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.licenseText.set(response);
        },
        error: (error) => {
          this.licenseText.set(`ERROR ${error.status}:\n\n    ${error.url}   ${error.statusText}`);
        },
      });
  }

  // ===================================
  // methods for the Pypi check tab
  // -----------------------------------
  //
  onTabChange(value: string | number | undefined) {
    if (String(value) === '2') {
      this.startPypiPoll();
    } else {
      this.pypiPollStop$.next();
      this.pypiPending.set(false);
    }
  }

  private startPypiPoll() {
    if (this.pypiinfo().length && this.pypiinfo().every((p) => p.pypi_version !== '--')) {
      return;
    }
    this.pypiPending.set(true);

    timer(0, 5000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeUntil(this.pypiPollStop$),
        switchMap(() => this.serverApi.getPypiInfo()),
      )
      .subscribe({
        next: (response) => {
          this.processPypiData(response as PypiInfo[]);
          if (this.pypiinfo().every((p) => p.pypi_version !== '--')) {
            this.pypiPending.set(false);
            this.pypiPollStop$.next();
          }
        },
        error: (err) => this.log.log('SystemComponent: pypi poll error:', err),
      });
  }

  private processPypiData(data: PypiInfo[]) {
    this.pypiinfo.set(data);
    this.loading.set(false);
    this.plugincount.set(data.filter((p) => p.is_required_for_plugins).length);
    this.documentationcount.set(data.filter((p) => p.is_required_for_docbuild).length);
    this.testsuitecount.set(data.filter((p) => p.is_required_for_testsuite).length);
    this.norequirementcount.set(
      data.filter(
        (p) =>
          !p.is_required &&
          !p.is_required_for_plugins &&
          !p.is_required_for_docbuild &&
          !p.is_required_for_testsuite,
      ).length,
    );
    this.reqinfodisplay = {};
    for (const pkg of data) {
      this.reqinfodisplay[pkg.name] = this.buildreqinfostring(pkg);
    }
  }

  buildreqinfostring(element: PypiInfo): string {
    /* Build String for requirements column */
    let reqString = '';

    if (
      element['vers_req_min'] !== '' &&
      element['vers_req_max'] !== '' &&
      element['vers_req_min'] !== element['vers_req_max']
    ) {
      // MIN and MAX filled, MIN != MAX
      reqString += element['vers_req_min'] + ' <= ';
    } else {
      if (
        element['vers_req_min'] !== '' &&
        element['vers_req_max'] != '' &&
        element['vers_req_min'] == element['vers_req_max']
      ) {
        // ELSE: MIN and MAX filled, MIN == MAX
        reqString += ' == ' + element['vers_req_min'];
      } else {
        if (element['vers_req_min'] !== '') {
          reqString += ' >= ' + element['vers_req_min'];
        } else if (element['vers_req_max'] !== '') {
          reqString += '<= ' + element['vers_req_max'];
        }
      }

      if (reqString === '') {
        // No MIN/MAX version constraint → all versions are valid
        reqString = ' == *';
      }
    }

    return reqString;
  }

  // ===================================
  // methods for the graph tab
  // -----------------------------------
  //
  initCharts() {
    this.log.log('initCharts()');

    // Defer the WebSocket connection until wsPort is available.
    // getServerBasicinfo() (APP_INITIALIZER) does not return websocket_port,
    // so wsPort is '' until getServerinfo() completes from TopNavigationComponent.
    // serverReady$ emits once wsPort becomes non-empty, which is the correct
    // moment to open the connection and start requesting chart series data.
    this.appConfig.serverReady$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const period = this.appConfig.resourceGraphPeriod;
      this.websocketPluginService.connect();
      this.websocketPluginService.getSeriesLoad(period);
      this.websocketPluginService.getSeriesSystemMemory(period);
      this.websocketPluginService.getSeriesSwap(period);
      this.websocketPluginService.getSeriesMemory(period);
      this.websocketPluginService.getSeriesThreads(period);
      this.websocketPluginService.getSeriesWorkerThreads(period);
      this.websocketPluginService.getSeriesDisk(period);
    });
  }

  updateChartData(
    chartdata: ChartData,
    dataseries: [number, number, { time: string }][],
    dataseries2: [number, number, { time: string }][] | null = null,
  ): ChartData {
    const labels: string[] = [];
    const data0: number[] = [];
    const data1: number[] = [];

    for (let i = 0; i < dataseries.length; i++) {
      labels.push(String(dataseries[i][2].time.slice(0, 5)));
      data0.push(dataseries[i][1]);
      if (dataseries2 != null) {
        data1.push(dataseries2[i][1]);
      }
    }

    const datasets = chartdata.datasets.map((ds, idx) => ({
      ...ds,
      data: idx === 0 ? data0 : data1,
    }));

    return { ...chartdata, labels, datasets };
  }
}

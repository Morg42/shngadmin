import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from '../../common/services/app-config.service';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ChartData } from 'chart.js';
import { combineLatest, Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { Bind } from 'primeng/bind';
import { UIChart } from 'primeng/chart';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Ripple } from 'primeng/ripple';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { APP_NAME, APP_VERSION } from '../../app.component';
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
  private readonly cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private serverApi = inject(ServerApiService);
  private translate = inject(TranslateService);
  private websocketPluginService = inject(WebsocketPluginService);
  public shared = inject(SharedService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  faCheckCircle = faCheckCircle;

  loading: boolean = true;
  licenseText = '';
  pypiPending = false;
  private readonly pypiPollStop$ = new Subject<void>();

  systeminfo: SystemInfo = <SystemInfo>{};
  pypiinfo!: PypiInfo[];
  reqinfodisplay!: Record<string, string>;
  plugincount = 0;
  documentationcount = 0;
  testsuitecount = 0;
  norequirementcount = 0;

  os_uptime = '';
  sh_uptime = '';

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

  chartdataLoad: ChartData = SystemComponent.emptyDataset('Load');
  chartdataSystemMemory: ChartData = SystemComponent.emptyDataset('Memory (MByte)');
  chartdataSwap: ChartData = SystemComponent.emptyDataset('Swap used (MByte)');
  chartdataMemory: ChartData = SystemComponent.emptyDataset('Memory (MByte)');
  chartdataThreads: ChartData = SystemComponent.emptyDataset('Threads');
  chartdataWorkerThreads: ChartData = SystemComponent.emptyDataset2(
    'Started Workers',
    'Active Workers',
  );
  chartdataDisk: ChartData = SystemComponent.emptyDataset('% disc usage');

  appName = APP_NAME;
  appVersion = 'v' + APP_VERSION;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('SystemComponent.ngOnInit:');

    this.setTitle(this.translate.instant('MENU.SYSTEM_PROPERTIES'));
    this.initSystemInfo();
    this.cdr.markForCheck();
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
          this.systeminfo = response as SystemInfo;

          this.os_uptime = this.shared.ageToString(this.systeminfo.uptime);
          this.sh_uptime = this.shared.ageToString(this.systeminfo.sh_uptime);
          this.cdr.markForCheck();
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
          this.licenseText = response;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.licenseText = `ERROR ${error.status}:\n\n    ${error.url}   ${error.statusText}`;
          this.cdr.markForCheck();
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
      this.pypiPending = false;
      this.cdr.markForCheck();
    }
  }

  private startPypiPoll() {
    if (this.pypiinfo?.length && this.pypiinfo.every((p) => p.pypi_version !== '--')) {
      return;
    }
    this.pypiPending = true;
    this.cdr.markForCheck();

    timer(0, 5000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeUntil(this.pypiPollStop$),
        switchMap(() => this.serverApi.getPypiInfo()),
      )
      .subscribe({
        next: (response) => {
          this.processPypiData(response as PypiInfo[]);
          if (this.pypiinfo.every((p) => p.pypi_version !== '--')) {
            this.pypiPending = false;
            this.pypiPollStop$.next();
          }
          this.cdr.markForCheck();
        },
        error: (err) => this.log.log('SystemComponent: pypi poll error:', err),
      });
  }

  private processPypiData(data: PypiInfo[]) {
    this.pypiinfo = data;
    this.loading = false;
    this.plugincount = data.filter((p) => p.is_required_for_plugins).length;
    this.documentationcount = data.filter((p) => p.is_required_for_docbuild).length;
    this.testsuitecount = data.filter((p) => p.is_required_for_testsuite).length;
    this.norequirementcount = data.filter(
      (p) =>
        !p.is_required &&
        !p.is_required_for_plugins &&
        !p.is_required_for_docbuild &&
        !p.is_required_for_testsuite,
    ).length;
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

    this.chartdataLoad = {
      labels: [],
      datasets: [
        {
          label: 'Load',
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };

    this.chartdataThreads = {
      labels: [],
      datasets: [
        {
          label: 'Threads',
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };

    this.chartdataWorkerThreads = {
      labels: [],
      datasets: [
        {
          label: 'Started Workers',
          data: [],
          fill: false,
          backgroundColor: '#ff8000',
          borderColor: '#ff8000',
          pointRadius: 0,
        },
        {
          label: 'Active Workers',
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };

    this.chartdataSystemMemory = {
      labels: [],
      datasets: [
        {
          label: 'Memory (MByte)',
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };

    this.chartdataSwap = {
      labels: [],
      datasets: [
        {
          label: 'Swap used (MByte)',
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };

    this.chartdataMemory = {
      labels: [],
      datasets: [
        {
          label: 'Memory (MByte)',
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };

    this.chartdataDisk = {
      labels: [],
      datasets: [
        {
          label: '% disc usage',
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,
        },
      ],
    };

    this.websocketPluginService.connect();
    this.websocketPluginService.getSeriesLoad();
    this.websocketPluginService.getSeriesSystemMemory();
    this.websocketPluginService.getSeriesSwap();
    this.websocketPluginService.getSeriesMemory();
    this.websocketPluginService.getSeriesThreads();
    this.websocketPluginService.getSeriesWorkerThreads();
    this.websocketPluginService.getSeriesDisk();
    this.drawCharts();
  }

  drawCharts() {
    this.log.log('DrawCharts()');
    this.websocketPluginService.systemloadUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.chartdataLoad = this.updateChartData(
          this.chartdataLoad,
          this.websocketPluginService.systemload.series,
        );
        this.cdr.markForCheck();
      });
    this.websocketPluginService.systemmemoryUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.chartdataSystemMemory = this.updateChartData(
          this.chartdataSystemMemory,
          this.websocketPluginService.systemmemory.series,
        );
        this.cdr.markForCheck();
      });
    this.websocketPluginService.systemswapUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.chartdataSwap = this.updateChartData(
          this.chartdataSwap,
          this.websocketPluginService.systemswap.series,
        );
        this.cdr.markForCheck();
      });
    this.websocketPluginService.memoryUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.chartdataMemory = this.updateChartData(
          this.chartdataMemory,
          this.websocketPluginService.memory.series,
        );
        this.cdr.markForCheck();
      });
    this.websocketPluginService.threadsUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.chartdataThreads = this.updateChartData(
          this.chartdataThreads,
          this.websocketPluginService.threads.series,
        );
        this.cdr.markForCheck();
      });
    combineLatest([
      this.websocketPluginService.workerThreadsUpdate$,
      this.websocketPluginService.idleWorkerThreadsUpdate$,
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const workerSeries = this.websocketPluginService.workerThreads.series;
        const idleSeries = this.websocketPluginService.idleWorkerThreads.series;
        const len = Math.min(workerSeries.length, idleSeries.length);
        const activeSeries: [number, number, { time: string }][] = [];
        for (let i = 0; i < len; i++) {
          activeSeries.push([
            workerSeries[i][0],
            workerSeries[i][1] - idleSeries[i][1],
            workerSeries[i][2],
          ]);
        }
        this.chartdataWorkerThreads = this.updateChartData(
          this.chartdataWorkerThreads,
          workerSeries.slice(0, len),
          activeSeries,
        );
        this.cdr.markForCheck();
      });
    this.websocketPluginService.diskUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.chartdataDisk = this.updateChartData(
          this.chartdataDisk,
          this.websocketPluginService.disk.series,
        );
        this.cdr.markForCheck();
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

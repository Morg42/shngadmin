import { Component, OnInit, OnDestroy, ViewChildren, EventEmitter, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import {AppConfigService} from '../../common/services/app-config.service';
import { Title } from '@angular/platform-browser';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

import { UIChart } from 'primeng/chart';
import { ChartData } from 'chart.js';

//import * as $ from 'jquery';

import { OlddataService } from '../../common/services/olddata.service';
import { SystemInfo } from '../../common/models/system-info';
import { PypiInfo } from '../../common/models/pypi-info';
import { WebsocketService } from '../../common/services/websocket.service';
import { WebsocketPluginService } from '../../common/services/websocket-plugin.service';
import { SharedService } from '../../common/services/shared.service';
import { ServerApiService } from '../../common/services/server-api.service';
import {AppComponent} from '../../app.component';


@Component({
  selector: 'app-system',
  templateUrl: './system.component.html',
  styleUrls: ['./system.component.css'],
  providers: [ WebsocketService, WebsocketPluginService ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemComponent implements OnDestroy, OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private dataService = inject(OlddataService);
  private dataServiceServer = inject(ServerApiService);
  private translate = inject(TranslateService);
  private websocketPluginService = inject(WebsocketPluginService);
  public app = inject(AppComponent);
  public shared = inject(SharedService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);

  faCheckCircle = faCheckCircle;

  loading: boolean = true;

  @ViewChildren('chrtSystemload') chartSystemload: UIChart;
  @ViewChildren('chrtSystemMemory') chartSystemMemory: UIChart;
  @ViewChildren('chrtSwap') chartSwap: UIChart;
  @ViewChildren('chrtMemory') chartMemory: UIChart;
  @ViewChildren('chrtThreads') chartThreads: UIChart;
  @ViewChildren('chrtWorkerThreads') chartWorkerThreads: UIChart;
  @ViewChildren('chrtDisk') chartDisk: UIChart;

  systeminfo: SystemInfo = <SystemInfo>{};
  pypiinfo: PypiInfo[];
  reqinfodisplay: {};
  plugincount = 0;
  documentationcount = 0;
  testsuitecount = 0;
  norequirementcount = 0;

  os_uptime = '';
  sh_uptime = '';

  chartoptions1: Record<string, unknown>;
  chartoptionsSystem: Record<string, unknown>;
  chartoptionsShng: Record<string, unknown>;
  chartoptionsScheduler: Record<string, unknown>;
  chartoptionsDisc: Record<string, unknown>;

  chartdataLoad: ChartData;
  chartdataSystemMemory: ChartData;
  chartdataSwap: ChartData;
  chartdataMemory: ChartData;
  chartdataThreads: ChartData;
  chartdataWorkerThreads: ChartData;
  chartdataDisk: ChartData;

  changed_chartdataLoad: unknown;
  loadData: unknown;
  varChartSystemload: unknown;

  appName = this.app.APP_NAME;
  appVersion = 'v' + this.app.APP_VERSION;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    console.log('SystemComponent.ngOnInit:');

    // this.setTitle(this.translate.instant('System Eigenschaften'));

    this.dataServiceServer!.getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response) => {
          this.setTitle(this.translate.instant('MENU.SYSTEM_PROPERTIES'));
          this.initSystemInfo();
          this.cdr.markForCheck();
        }
      );
  }


  ngOnDestroy(): void {
    this.websocketPluginService.disconnect();
  }


  initSystemInfo() {

    // ---------------------------------------------
    // Initialize system info (from OlddataService)
    //
    this.dataService.getSysteminfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response: SystemInfo) => {
          this.systeminfo = response;

          this.os_uptime = this.shared.ageToString(this.systeminfo.uptime);
          this.sh_uptime = this.shared.ageToString(this.systeminfo.sh_uptime);
          this.cdr.markForCheck();
        },
        (error) => {
          console.log('SystemComponent: dataService.getSysteminfo():');
          console.log(error);
        }
      );


    // -----------------------------------
    // Initialize Pypi info
    //
    this.dataService.getPypiinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response: PypiInfo[]) => {
          this.pypiinfo = response;
          this.loading = false;

          // count if plugin requirements exist
          this.plugincount = 0;
          for (let i = 0; i < this.pypiinfo.length; ++i) {
            // if (this.pypiinfo[i].name === 'ruamel.yaml') {
            //   console.log(this.pypiinfo[i]);
            // }
            if (this.pypiinfo[i].is_required_for_plugins === true) {
              this.plugincount++;
            }
          }

          // count if documentation requirements exist
          this.documentationcount = 0;
          for (let i = 0; i < this.pypiinfo.length; ++i) {
            if (this.pypiinfo[i].is_required_for_docbuild === true) {
              this.documentationcount++;
            }
          }

          // count if testsuite requirements exist
          this.testsuitecount = 0;
          for (let i = 0; i < this.pypiinfo.length; ++i) {
            if (this.pypiinfo[i].is_required_for_testsuite === true) {
              this.testsuitecount++;
            }
          }

          // count if package without requirements exist
          this.norequirementcount = 0;
          for (let i = 0; i < this.pypiinfo.length; ++i) {
            if (this.pypiinfo[i].is_required === false && this.pypiinfo[i].is_required_for_docbuild === false &&
              this.pypiinfo[i].is_required_for_testsuite === false) {
              this.norequirementcount++;
            }
          }

          this.reqinfodisplay = {};
          for (let i = 0; i < this.pypiinfo.length; ++i) {
            this.reqinfodisplay[this.pypiinfo[i].name] = this.buildreqinfostring(this.pypiinfo[i]);
          }
          this.cdr.markForCheck();
        },
        (error) => console.log('SystemComponent: dataService.getPypiinfo():' + error)
      );


    // -----------------------------------
    // Initialize info for the graph-tab
    //
    this.initCharts();


    let filepath = '/3rdpartylicenses.txt';
    const hostip = this.appConfig.hostIp;
    const disclosureText = document.getElementById('disclosuretext');
    filepath = '/admin' + filepath;
    this.http.get(filepath, {responseType: 'text'})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        response => {
          const message = response.toString();
          if (disclosureText) {
            disclosureText.textContent = message;
          }
        },
        error => {
          if (disclosureText) {
            disclosureText.textContent = '\nERROR ' + error.status + ':\n\n    ' + error.url + '   ' + error.statusText;
          }
        });
  }


  // ===================================
  // methods for the Pypi check tab
  // -----------------------------------
  //
  buildreqinfostring(element) {

    /* Build String for requirements column */
    let reqString = '';

    if (element['vers_req_min'] !== '' && element['vers_req_max'] !== '' && (element['vers_req_min'] !== element['vers_req_max'])) {
      // MIN and MAX filled, MIN != MAX
      reqString += element['vers_req_min'] + ' <= ';
    } else {
      if (element['vers_req_min'] !== '' && element['vers_req_max'] != '' && (element['vers_req_min'] == element['vers_req_max'])) {
        // ELSE: MIN and MAX filled, MIN == MAX
        reqString += ' == ' + element['vers_req_min'];
      } else {
        // ELSE: MIN or MAX filled * /
        if (element['vers_req_min'] !== '') {
          reqString += ' >= ' + element['vers_req_min'];
        } else if (element['vers_req_max'] !== '') {
          reqString += '<= ' + element['vers_req_max'];
        }
      }

      if (reqString === '') {
        // Element required due to Doku, Testsuite or SmartHomeNG in general, but no MIN and MAX version -> all versions valid * /
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
    console.log('initCharts()');



    this.chartoptions1 = {
      scales: {
        xAxes: [{
//          type: 'time',
          distribution: 'linear',
          time: {
            unit: 'minute'
          },
        }]
      }
    };

    this.chartoptionsSystem = {
      title: {
        display: true,
        text: 'System',
      },
      scales: {
        xAxes: [{
//          type: 'time',
          distribution: 'linear',
          time: {
            unit: 'minute'
          },
        }]
      }
    };

    this.chartoptionsShng = {
      title: {
        display: true,
        text: 'SmartHomeNG',
      },
      scales: {
        xAxes: [{
//          type: 'time',
          distribution: 'linear',
          time: {
            unit: 'minute'
          },
        }],
        yAxes: [{
          ticks: {
            min: 0
          }
        }]
      }
    };

    this.chartoptionsScheduler = {
      title: {
        display: true,
        text: 'SmartHomeNG Scheduler',
      },
      scales: {
        xAxes: [{
//          type: 'time',
          distribution: 'linear',
          time: {
            unit: 'minute'
          },
        }],
        yAxes: [{
          ticks: {
            min: 0
          }
        }]
      }
    };

    this.chartoptionsDisc = {
      title: {
        display: true,
        text: 'System',
      },
      scales: {
        xAxes: [{
//          type: 'time',
          distribution: 'linear',
          time: {
            unit: 'minute'
          },
        }]
      }
    };

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

        }
      ]
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

        }
      ]
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

        }
        // {
        //   label: 'Idle Workers',
        //   data: [],
        //   fill: false,
        //   backgroundColor: '008000',
        //   borderColor: '#008000',
        //   pointRadius: 0,
        //
        // }
      ]
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

        }
      ]
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

        }
      ]
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

        }
      ]
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

        }
      ]
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
    console.log('DrawCharts()');
    this.websocketPluginService.systemloadUpdate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      // console.error('systemloadUpdate$');
      this.updateChartData(this.chartSystemload, this.chartdataLoad, this.websocketPluginService.systemload.series);
      this.cdr.markForCheck();
    });
    this.websocketPluginService.systemmemoryUpdate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
//      console.error('systemmemoryUpdate$');
      this.updateChartData(this.chartSystemMemory, this.chartdataSystemMemory, this.websocketPluginService.systemmemory.series);
      this.cdr.markForCheck();
    });
    this.websocketPluginService.systemswapUpdate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
//      console.error('systemswapUpdate$');
      this.updateChartData(this.chartSwap, this.chartdataSwap, this.websocketPluginService.systemswap.series);
      this.cdr.markForCheck();
    });
    this.websocketPluginService.memoryUpdate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
//      console.error('memoryUpdate$');
      this.updateChartData(this.chartMemory, this.chartdataMemory, this.websocketPluginService.memory.series);
      this.cdr.markForCheck();
    });
    this.websocketPluginService.threadsUpdate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
//      console.error('threadsUpdate$');
      this.updateChartData(this.chartThreads, this.chartdataThreads, this.websocketPluginService.threads.series);
      this.cdr.markForCheck();
    });
    this.websocketPluginService.workerThreadsUpdate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
//      console.error('workerThreadsUpdate$');
        this.websocketPluginService.idleWorkerThreadsUpdate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
    //      console.error('idleWorkerThreadsUpdate$');
          this.websocketPluginService.activeWorkerThreads.series = [];
          this.websocketPluginService.activeWorkerThreads.tsdiff = this.websocketPluginService.idleWorkerThreads.tsdiff ;
          for (let i = 0; i < this.websocketPluginService.workerThreads.series.length; i++) {
            this.websocketPluginService.activeWorkerThreads.series.push(this.websocketPluginService.idleWorkerThreads.series[i]);
            this.websocketPluginService.activeWorkerThreads.series[i][1] = this.websocketPluginService.workerThreads.series[i][1] - this.websocketPluginService.idleWorkerThreads.series[i][1];
          }
          this.updateChartData(this.chartWorkerThreads, this.chartdataWorkerThreads, this.websocketPluginService.workerThreads.series, this.websocketPluginService.activeWorkerThreads.series);
          this.cdr.markForCheck();
        });
    });
    this.websocketPluginService.diskUpdate$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
//      console.error('diskUpdate$');
      this.updateChartData(this.chartDisk, this.chartdataDisk, this.websocketPluginService.disk.series);
      this.cdr.markForCheck();
    });
  }


  updateChartData(chart: UIChart, chartdata, dataseries, dataseries2 = null) {
    chartdata.labels = [];
    chartdata.datasets[0].data = [];
    if ((dataseries.length > 1) && (dataseries2 != null)) {
      chartdata.datasets[1].data = [];
    }
    // console.warn('datasets', chartdata.datasets.length);

    for (let i = 0; i < dataseries.length; i++) {
      chartdata.labels.push(String(dataseries[i][2].time.substr(0, 5)));
      chartdata.datasets[0].data.push(dataseries[i][1]);
      if ((dataseries.length > 1) && (dataseries2 != null)) {
        chartdata.datasets[1].data.push(dataseries2[i][1]);
      }
    }
  }





  updateSystemloadChart(chart: UIChart) {
    chart.refresh();
  }


  setSystemloadData(loadData) {

    this.chartdataLoad = {
      labels: [],
      datasets: [
        {
          label: 'System Load',
          data: [],
          fill: false,
          backgroundColor: '#709cc2',
          borderColor: '#709cc2',
          pointRadius: 0,

        }
      ]
    };

    if (loadData === undefined) {
    } else {
      console.log('setSystemloadData (callback)');
      console.log(loadData);
      this.loadData = loadData;

      this.chartdataLoad.labels = [];
      this.chartdataLoad.datasets[0].data = [];
      console.log('Datapoints: ' + String(loadData.length));
      for (let i = 0; i < loadData.length; i++) {
        this.chartdataLoad.datasets[0].data.push(loadData[i][1]);
      }

      console.log(this.chartdataLoad.labels);
      console.log(this.chartdataLoad.datasets[0].data);

    }
  }

}

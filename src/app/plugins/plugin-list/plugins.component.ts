import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  faExclamationTriangle,
  faLaptopCode,
  faPauseCircle,
  faPlayCircle,
} from '@fortawesome/free-solid-svg-icons';
import { AppConfigService } from '../../common/services/app-config.service';

import { NgOptimizedImage, UpperCasePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateDirective, TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Bind } from 'primeng/bind';
import { Dialog } from 'primeng/dialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { PlugininfoType } from '../../common/models/plugin-info';
import { LogService } from '../../common/services/log.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { ServerApiService } from '../../common/services/server-api.service';

@Component({
  selector: 'app-plugins',
  templateUrl: './plugins.component.html',
  styleUrls: ['./plugins.component.css'],
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FaIconComponent,
    NgOptimizedImage,
    Bind,
    Dialog,
    ProgressSpinner,
    TranslateDirective,
    UpperCasePipe,
    TranslatePipe,
  ],
})
export class PluginsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private dataServiceServer = inject(ServerApiService);
  private pluginsDataService = inject(PluginsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  faPlayCircle = faPlayCircle;
  faPauseCircle = faPauseCircle;
  faExclamationTriangle = faExclamationTriangle; // signal deprecated plugin
  faCode = faLaptopCode; // signal plugin in state "develop"

  plugininfo: PlugininfoType[];
  developerMode: boolean;
  loading = true;

  showPluginDetails = false;
  selectedPlugin: PlugininfoType | null = null;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('PluginsComponent.ngOnInit');

    this.dataServiceServer
      .getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.setTitle(this.translate.instant('MENU.PLUGINS_LIST'));

        this.developerMode = this.appConfig.developerMode;
        this.getPlugins();
      });
    /*
    this.dataServiceServer.getServerinfo()
      .subscribe(
        (response) => {
          this.developerMode = (this.appConfig.developerMode);

          this.pluginsDataService.getPluginsInfo()
            .subscribe(
              (response2) => {
                this.plugininfo = <any>response2;
                this.plugininfo.sort(function (a, b) {return (a.pluginname + a.configname.toLowerCase() > b.pluginname + b.configname.
                toLowerCase()) ? 1 : ((b.pluginname + b.configname.toLowerCase() > a.pluginname + a.configname.toLowerCase()) ? -1 : 0); });
              }
            );
        }
      );
*/
  }

  getPlugins() {
    this.loading = true;
    this.cdr.markForCheck();
    this.pluginsDataService
      .getPluginsInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.plugininfo = response as PlugininfoType[];
        this.plugininfo.sort(function (a, b) {
          return a.pluginname + a.configname.toLowerCase() >
            b.pluginname + b.configname.toLowerCase()
            ? 1
            : b.pluginname + b.configname.toLowerCase() > a.pluginname + a.configname.toLowerCase()
              ? -1
              : 0;
        });
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  parameterLines(parameters) {
    let result = Math.round(parameters / 2);
    if (result < 3) {
      result = 3;
    }
    return result;
  }

  attributeLines(parameters) {
    let result = Math.round(parameters / 3);
    if (result < 2) {
      result = 2;
    }
    return result;
  }

  goToLink(url: string) {
    window.open(url, '_blank');
  }

  stopPlugin(pluginConfigName) {
    // this.log.log('stopPlugin', {pluginConfigName});

    this.pluginsDataService
      .setPluginState(pluginConfigName, 'stop')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.getPlugins();
      });
  }

  startPlugin(pluginConfigName) {
    // this.log.log('startPlugin', {pluginConfigName});

    this.pluginsDataService
      .setPluginState(pluginConfigName, 'start')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.getPlugins();
      });
  }

  reloadPlugin(pluginConfigName) {
    // this.log.log('reloadPlugin', {pluginConfigName});

    this.pluginsDataService
      .setPluginState(pluginConfigName, 'reload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.getPlugins();
      });
  }
}

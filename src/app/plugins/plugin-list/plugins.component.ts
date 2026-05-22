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
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { PlugininfoType } from '../../common/models/plugin-info';
import { LogService } from '../../common/services/log.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';

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
    InputText,
    ProgressSpinner,
    TranslateDirective,
    UpperCasePipe,
    TranslatePipe,
  ],
})
export class PluginsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private pluginsDataService = inject(PluginsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  faPlayCircle = faPlayCircle;
  faPauseCircle = faPauseCircle;
  faExclamationTriangle = faExclamationTriangle; // signal deprecated plugin
  faCode = faLaptopCode; // signal plugin in state "develop"

  plugininfo!: PlugininfoType[];
  developerMode!: boolean;
  loading = true;

  sortField = '';
  sortOrder: 1 | -1 = 1;

  sortBy(field: string): void {
    this.sortOrder = this.sortField === field ? (this.sortOrder === 1 ? -1 : 1) : 1;
    this.sortField = field;
    const ord = this.sortOrder;
    this.plugininfo.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      return av < bv ? -ord : av > bv ? ord : 0;
    });
    this.cdr.markForCheck();
  }

  filterText = '';

  onFilterChange(value: string): void {
    this.filterText = value;
    this.cdr.markForCheck();
  }

  clearFilter(): void {
    this.filterText = '';
    this.cdr.markForCheck();
  }

  get filteredPlugins(): PlugininfoType[] {
    if (!this.filterText) return this.plugininfo;
    const f = this.filterText.toLowerCase();
    return this.plugininfo.filter(
      (p) =>
        p.configname.toLowerCase().includes(f) ||
        p.pluginname.toLowerCase().includes(f) ||
        p.instancename.toLowerCase().includes(f),
    );
  }

  showPluginDetails = false;
  selectedPlugin: PlugininfoType | null = null;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('PluginsComponent.ngOnInit');

    this.setTitle(this.translate.instant('MENU.PLUGINS_LIST'));
    this.developerMode = this.appConfig.developerMode;
    this.getPlugins();
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

  parameterLines(parameters: number) {
    let result = Math.round(parameters / 2);
    if (result < 3) {
      result = 3;
    }
    return result;
  }

  attributeLines(parameters: number) {
    let result = Math.round(parameters / 3);
    if (result < 2) {
      result = 2;
    }
    return result;
  }

  goToLink(url: string) {
    window.open(url, '_blank');
  }

  stopPlugin(pluginConfigName: string) {
    // this.log.log('stopPlugin', {pluginConfigName});

    this.pluginsDataService
      .setPluginState(pluginConfigName, 'stop')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.getPlugins();
      });
  }

  startPlugin(pluginConfigName: string) {
    // this.log.log('startPlugin', {pluginConfigName});

    this.pluginsDataService
      .setPluginState(pluginConfigName, 'start')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.getPlugins();
      });
  }

  reloadPlugin(pluginConfigName: string) {
    // this.log.log('reloadPlugin', {pluginConfigName});

    this.pluginsDataService
      .setPluginState(pluginConfigName, 'reload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.getPlugins();
      });
  }
}

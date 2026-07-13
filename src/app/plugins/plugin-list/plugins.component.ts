import { NgOptimizedImage, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faExclamationTriangle,
  faLaptopCode,
  faPauseCircle,
  faPlayCircle,
} from '@fortawesome/free-solid-svg-icons';
import { TranslateDirective, TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Bind } from 'primeng/bind';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Subject, merge, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
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
  private pluginsDataService = inject(PluginsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  faPlayCircle = faPlayCircle;
  faPauseCircle = faPauseCircle;
  faExclamationTriangle = faExclamationTriangle; // signal deprecated plugin
  faCode = faLaptopCode; // signal plugin in state "develop"

  /** Emits to re-fetch the plugin list (after start/stop actions). */
  private readonly refresh$ = new Subject<void>();

  readonly loading = signal(true);

  /** Base plugin list, sorted by pluginname+configname; refetched on every
   *  refresh$ emission. */
  private readonly rawPlugininfo = toSignal(
    merge(of(undefined), this.refresh$).pipe(
      tap(() => this.loading.set(true)),
      switchMap(() => this.pluginsDataService.getPluginsInfo()),
      map((response) => {
        const list = Array.isArray(response) ? (response as PlugininfoType[]) : [];
        return [...list].sort((a, b) =>
          a.pluginname + a.configname.toLowerCase() > b.pluginname + b.configname.toLowerCase()
            ? 1
            : b.pluginname + b.configname.toLowerCase() > a.pluginname + a.configname.toLowerCase()
              ? -1
              : 0,
        );
      }),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: [] as PlugininfoType[] },
  );

  readonly sortField = signal('');
  readonly sortOrder = signal<1 | -1>(1);

  /** Column-sorted view - pure computed over a copy. */
  readonly plugininfo = computed(() => {
    const list = this.rawPlugininfo();
    const field = this.sortField();
    if (!field) {
      return list;
    }
    const ord = this.sortOrder();
    return [...list].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      return av < bv ? -ord : av > bv ? ord : 0;
    });
  });

  sortBy(field: string): void {
    this.sortOrder.set(this.sortField() === field ? (this.sortOrder() === 1 ? -1 : 1) : 1);
    this.sortField.set(field);
  }

  readonly filterText = signal('');

  onFilterChange(value: string): void {
    this.filterText.set(value);
  }

  clearFilter(): void {
    this.filterText.set('');
  }

  readonly filteredPlugins = computed<PlugininfoType[]>(() => {
    const f = this.filterText().toLowerCase();
    if (!f) return this.plugininfo();
    return this.plugininfo().filter(
      (p) =>
        p.configname.toLowerCase().includes(f) ||
        p.pluginname.toLowerCase().includes(f) ||
        p.instancename.toLowerCase().includes(f),
    );
  });

  showPluginDetails = false;
  selectedPlugin: PlugininfoType | null = null;

  ngOnInit() {
    this.log.log('PluginsComponent.ngOnInit');
    this.titleService.setTitle(this.translate.instant('MENU.PLUGINS_LIST'));
  }

  private getPlugins() {
    this.refresh$.next();
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
}

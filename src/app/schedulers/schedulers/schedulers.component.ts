import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppConfigService } from '../../common/services/app-config.service';

import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Bind } from 'primeng/bind';
import { Ripple } from 'primeng/ripple';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { SchedulerInfo } from '../../common/models/scheduler-info';
import { LogService } from '../../common/services/log.service';
import { SchedulersApiService } from '../../common/services/schedulers-api.service';

@Component({
  selector: 'app-schedulers',
  templateUrl: './schedulers.component.html',
  styleUrls: ['./schedulers.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Bind, Tabs, TabList, Ripple, Tab, TabPanels, TabPanel, TranslatePipe],
})
export class SchedulersComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private dataService = inject(SchedulersApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  schedulerinfo!: SchedulerInfo[];
  developerMode!: boolean;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('SchedulersComponent.ngOnInit');

    this.setTitle(this.translate.instant('MENU.SCHEDULERS'));

    this.dataService
      .getSchedulers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response2) => {
        this.schedulerinfo = <SchedulerInfo[]>response2;
        //          this.schedulerinfo.sort(function (a, b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)});
        this.developerMode = this.appConfig.developerMode;

        this.log.log('getSchedulers', { response2 });
        this.cdr.markForCheck();
      });
  }
}

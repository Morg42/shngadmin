import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ThreadInfo } from '../../common/models/thread-info';
import { LogService } from '../../common/services/log.service';
import { ThreadsApiService } from '../../common/services/threads-api.service';

@Component({
  selector: 'app-threads',
  templateUrl: './threads.component.html',
  styleUrls: ['./threads.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class ThreadsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private dataService = inject(ThreadsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  threadsList!: ThreadInfo[];
  threads_count!: number;
  thread_response!: [number, ThreadInfo[]];

  sortField = '';
  sortOrder: 1 | -1 = 1;

  sortBy(field: string): void {
    this.sortOrder = this.sortField === field ? (this.sortOrder === 1 ? -1 : 1) : 1;
    this.sortField = field;
    const ord = this.sortOrder;
    this.threadsList.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      return av < bv ? -ord : av > bv ? ord : 0;
    });
    this.cdr.markForCheck();
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // this.log.log('ThreadsComponent.ngOnInit');

    this.setTitle(this.translate.instant('MENU.THREADS'));

    this.dataService
      .getThreads()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response2) => {
        const r2 = response2 as [number, unknown];
        this.threadsList = r2[1] as any;
        this.threads_count = r2[0];
        //          this.schedulerinfo.sort(function (a, b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)});
        this.log.log('getThreads', { response2 });
        this.cdr.markForCheck();
      });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, tap } from 'rxjs/operators';
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
  private dataService = inject(ThreadsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  /** Raw [total count, thread list] response as a signal. toSignal()
   *  subscribes on construction and unsubscribes on destroy - no DestroyRef
   *  or manual markForCheck needed. The API service returns of({}) on error,
   *  so normalize anything non-array to an empty result. */
  private readonly threadsResponse = toSignal(
    this.dataService.getThreads().pipe(
      tap((response) => this.log.log('getThreads', { response })),
      map((response) =>
        Array.isArray(response)
          ? (response as [number, ThreadInfo[]])
          : ([0, []] as [number, ThreadInfo[]]),
      ),
    ),
    { initialValue: [0, []] as [number, ThreadInfo[]] },
  );

  readonly sortField = signal('');
  readonly sortOrder = signal<1 | -1>(1);

  readonly threads_count = computed(() => this.threadsResponse()[0]);

  /** Sorted view derived from the raw list - sorting is a pure computed over
   *  a copy, never an in-place mutation of shared state. */
  readonly threadsList = computed(() => {
    const list = this.threadsResponse()[1];
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

  ngOnInit() {
    this.titleService.setTitle(this.translate.instant('MENU.THREADS'));
  }
}

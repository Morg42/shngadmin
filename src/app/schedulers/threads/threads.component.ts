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
import { MessageService, PrimeTemplate, type ToastMessageOptions } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Subject } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { CancelOutcome, ThreadInfo, ThreadTaskDetails } from '../../common/models/thread-info';
import { LogService } from '../../common/services/log.service';
import { ThreadsApiService } from '../../common/services/threads-api.service';

/** A task run selected for cancellation, pending the user's confirmation. */
export interface CancelTarget {
  ident: number;
  taskId: number;
  name: string;
}

/** Toast severity and translation key reporting each cancellation outcome. */
const CANCEL_TOASTS: Record<
  CancelOutcome,
  Pick<ToastMessageOptions, 'severity' | 'sticky'> & { key: string }
> = {
  requested: { severity: 'success', key: 'THREADS.CANCEL_REQUESTED' },
  not_found: { severity: 'info', key: 'THREADS.CANCEL_NOT_FOUND' },
  not_cancellable: { severity: 'warn', key: 'THREADS.CANCEL_NOT_CANCELLABLE' },
  error: { severity: 'error', key: 'THREADS.CANCEL_FAILED', sticky: true },
};

@Component({
  selector: 'app-threads',
  templateUrl: './threads.component.html',
  styleUrls: ['./threads.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ButtonDirective, Dialog, PrimeTemplate],
})
export class ThreadsComponent implements OnInit {
  private dataService = inject(ThreadsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private messageService = inject(MessageService);
  private readonly log = inject(LogService);

  private readonly reload$ = new Subject<void>();

  /** Raw [total count, thread list] response as a signal, refetched on reload().
   *  toSignal() subscribes on construction and unsubscribes on destroy - no
   *  DestroyRef or manual markForCheck needed. The API service returns of({})
   *  on error, so normalize anything non-array to an empty result. */
  private readonly threadsResponse = toSignal(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() => this.dataService.getThreads()),
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

  /** Stack dialog state: the thread whose stack was requested and the loaded details (null = task finished). */
  readonly stackVisible = signal(false);
  readonly stackThreadName = signal('');
  private readonly stackDetails = signal<ThreadTaskDetails | null>(null);
  readonly stackTaskFinished = signal(false);
  readonly stackText = computed(() => this.stackDetails()?.stack.join('') ?? '');
  readonly stackCancellable = computed(() => this.stackDetails()?.task.cancellable ?? false);

  /** Task run awaiting the user's confirmation to be cancelled; null while no confirmation is open. */
  readonly cancelTarget = signal<CancelTarget | null>(null);

  sortBy(field: string): void {
    this.sortOrder.set(this.sortField() === field ? (this.sortOrder() === 1 ? -1 : 1) : 1);
    this.sortField.set(field);
  }

  reload(): void {
    this.reload$.next();
  }

  /** Load the current stack of the task running on ``thread`` and open the stack dialog. */
  showStack(thread: ThreadInfo): void {
    this.stackThreadName.set(thread.name);
    this.dataService.getThreadTask(Number(thread.id)).subscribe((details) => {
      this.stackDetails.set(details);
      this.stackTaskFinished.set(details === null);
      this.stackVisible.set(true);
    });
  }

  /** Open the cancel confirmation for the task running on ``thread``. */
  askCancel(thread: ThreadInfo): void {
    if (thread.task) {
      this.cancelTarget.set({
        ident: Number(thread.id),
        taskId: thread.task.task_id,
        name: thread.name,
      });
    }
  }

  /** Open the cancel confirmation for the task shown in the stack dialog. */
  askCancelFromStack(): void {
    const details = this.stackDetails();
    if (details) {
      this.cancelTarget.set({
        ident: details.id,
        taskId: details.task.task_id,
        name: details.task.name,
      });
    }
  }

  abortCancel(): void {
    this.cancelTarget.set(null);
  }

  /** Request cancellation of the confirmed task run, report the outcome and reload the list. */
  confirmCancel(): void {
    const target = this.cancelTarget();
    if (!target) {
      return;
    }
    this.cancelTarget.set(null);
    this.dataService.cancelThreadTask(target.ident, target.taskId).subscribe((outcome) => {
      const { key, ...toast } = CANCEL_TOASTS[outcome];
      this.messageService.add({
        ...toast,
        summary: this.translate.instant(key),
        detail: target.name,
        life: 5000,
      });
      this.stackVisible.set(false);
      this.reload();
    });
  }

  /** Runtime as '7.5 s' below one minute, else '3 min 7 s'. */
  formatRuntime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)} s`;
    }
    return `${Math.floor(seconds / 60)} min ${Math.floor(seconds % 60)} s`;
  }

  ngOnInit() {
    this.titleService.setTitle(this.translate.instant('MENU.THREADS'));
  }
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CancelOutcome, ThreadTaskDetails } from '../models/thread-info';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class ThreadsApiService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  getThreads() {
    const apiUrl = this.appConfig.apiUrl;
    let url = apiUrl + 'threads/';
    return this.http.get(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          'ThreadsApiService (getThreads): Could not read threads data' + ' - ' + err.error.error,
        );
        return of({});
      }),
    );
  }

  /** Scheduler task running on thread ``ident`` with its current stack; null if none runs there (anymore). */
  getThreadTask(ident: number): Observable<ThreadTaskDetails | null> {
    const url = this.appConfig.apiUrl + 'threads/' + ident;
    return this.http.get<ThreadTaskDetails>(url).pipe(
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          `ThreadsApiService (getThreadTask): no task on thread ${ident} - ${err.status}`,
        );
        return of(null);
      }),
    );
  }

  /** Request cancellation of task run ``taskId`` (a logic) on thread ``ident``. */
  cancelThreadTask(ident: number, taskId: number): Observable<CancelOutcome> {
    const url = this.appConfig.apiUrl + 'threads/' + ident + '/cancel';
    return this.http.post(url, { task_id: taskId }).pipe(
      map((): CancelOutcome => 'requested'),
      catchError((err: HttpErrorResponse) => {
        this.log.error(
          `ThreadsApiService (cancelThreadTask): thread ${ident}, task ${taskId} - ${err.status}`,
        );
        const outcomes: Record<number, CancelOutcome> = {
          404: 'not_found',
          409: 'not_cancellable',
        };
        return of(outcomes[err.status] ?? 'error');
      }),
    );
  }
}

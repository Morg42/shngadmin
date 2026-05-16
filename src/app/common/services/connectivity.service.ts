import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

const BACKOFF_SECONDS = [2, 4, 8, 16, 30];
const HEARTBEAT_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly appConfig = inject(AppConfigService);
  // HttpBackend bypasses interceptors so probes never trigger the interceptor
  private readonly http = new HttpClient(inject(HttpBackend));

  private readonly _online$ = new BehaviorSubject<boolean>(true);
  private readonly _retryIn$ = new BehaviorSubject<number>(0);

  readonly online$ = this._online$.asObservable();
  readonly retryIn$ = this._retryIn$.asObservable();

  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start heartbeat once the API URL is known (set by ServerApiService ctor)
    this.appConfig.ready$.pipe(take(1)).subscribe(() => this.startHeartbeat());
  }

  markOffline(): void {
    if (!this._online$.getValue()) return;
    this._online$.next(false);
    this.stopHeartbeat();
    this.scheduleRetry();
  }

  retryNow(): void {
    this.clearRetryTimers();
    this.probe();
  }

  private markOnline(): void {
    this._online$.next(true);
    this._retryIn$.next(0);
    this.attempt = 0;
    this.clearRetryTimers();
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private heartbeat(): void {
    const url = this.appConfig.apiUrl + 'server/';
    this.http.get(url, { observe: 'response' }).subscribe({
      next: (response) => {
        const ct = response.headers.get('Content-Type') ?? '';
        if (ct.includes('text/html')) {
          this.markOffline();
        }
      },
      error: () => this.markOffline(),
    });
  }

  private scheduleRetry(): void {
    const delay = BACKOFF_SECONDS[Math.min(this.attempt, BACKOFF_SECONDS.length - 1)];
    this.attempt++;
    this._retryIn$.next(delay);

    this.countdownTimer = setInterval(() => {
      const remaining = this._retryIn$.getValue();
      if (remaining > 0) this._retryIn$.next(remaining - 1);
    }, 1000);

    this.retryTimer = setTimeout(() => this.probe(), delay * 1000);
  }

  private probe(): void {
    this.clearRetryTimers();
    const url = this.appConfig.apiUrl + 'server/';
    this.http.get(url).subscribe({
      next: () => this.markOnline(),
      error: () => this.scheduleRetry(),
    });
  }

  private clearRetryTimers(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}

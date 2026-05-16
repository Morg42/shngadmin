import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

const BACKOFF_SECONDS = [2, 4, 8, 16, 30];
const HEARTBEAT_INTERVAL_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly appConfig = inject(AppConfigService);
  private readonly http = inject(HttpClient);

  private readonly _online$ = new BehaviorSubject<boolean>(true);
  private readonly _retryIn$ = new BehaviorSubject<number>(0);

  readonly online$ = this._online$.asObservable();
  readonly retryIn$ = this._retryIn$.asObservable();

  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private offlineDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // A cancelled XHR (e.g. Angular destroying a component mid-request) also
  // produces status 0, which is indistinguishable from a real network failure.
  // The debounce gives the next page's requests a chance to succeed first; if
  // they do, cancelOfflineDebounce() clears the timer and the banner never shows.
  private readonly OFFLINE_DEBOUNCE_MS = 1500;

  constructor() {
    // Start heartbeat once the API URL is known (set by ServerApiService ctor)
    this.appConfig.ready$.pipe(take(1)).subscribe(() => this.startHeartbeat());
  }

  markOffline(): void {
    if (!this._online$.getValue()) return;
    if (this.offlineDebounceTimer !== null) return;
    this.offlineDebounceTimer = setTimeout(() => {
      this.offlineDebounceTimer = null;
      if (!this._online$.getValue()) return;
      this._online$.next(false);
      this.stopHeartbeat();
      this.scheduleRetry();
    }, this.OFFLINE_DEBOUNCE_MS);
  }

  cancelOfflineDebounce(): void {
    if (this.offlineDebounceTimer !== null) {
      clearTimeout(this.offlineDebounceTimer);
      this.offlineDebounceTimer = null;
    }
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
    this.http.get(url, { responseType: 'text' }).subscribe({
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
    this.http.get(url, { responseType: 'text' }).subscribe({
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
    this.cancelOfflineDebounce();
  }
}

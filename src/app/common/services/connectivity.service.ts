import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppConfigService } from './app-config.service';

const BACKOFF_SECONDS = [2, 4, 8, 16, 30];

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly appConfig = inject(AppConfigService);
  // HttpBackend bypasses interceptors so the probe never triggers itself
  private readonly http = new HttpClient(inject(HttpBackend));

  private readonly _online$ = new BehaviorSubject<boolean>(true);
  private readonly _retryIn$ = new BehaviorSubject<number>(0);

  readonly online$ = this._online$.asObservable();
  readonly retryIn$ = this._retryIn$.asObservable();

  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  markOffline(): void {
    if (!this._online$.getValue()) return;
    this._online$.next(false);
    this.scheduleRetry();
  }

  retryNow(): void {
    this.clearTimers();
    this.probe();
  }

  private markOnline(): void {
    this._online$.next(true);
    this._retryIn$.next(0);
    this.attempt = 0;
    this.clearTimers();
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
    this.clearTimers();
    const url = this.appConfig.apiUrl + 'server/';
    this.http.get(url).subscribe({
      next: () => this.markOnline(),
      error: () => this.scheduleRetry(),
    });
  }

  private clearTimers(): void {
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

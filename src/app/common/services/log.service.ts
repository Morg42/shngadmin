import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * Logging service that suppresses debug/log output in production while
 * always forwarding warn and error. Inject this instead of calling
 * console directly so that production builds stay quiet.
 *
 * Migration: replace `console.log(...)` with `this.log.log(...)` etc.
 */
@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly prod = environment.production;

  log(...args: unknown[]): void {
    if (!this.prod) console.log(...args);
  }

  debug(...args: unknown[]): void {
    if (!this.prod) console.debug(...args);
  }

  warn(...args: unknown[]): void {
    console.warn(...args);
  }

  error(...args: unknown[]): void {
    console.error(...args);
  }
}

import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ConnectivityService } from '../services/connectivity.service';

const OFFLINE_STATUSES = new Set([0, 502, 503, 504]);

export const connectivityInterceptor: HttpInterceptorFn = (req, next) => {
  const connectivity = inject(ConnectivityService);
  return next(req).pipe(
    tap({
      next: (event) => {
        // Proxy error pages (e.g. WebStorm dev proxy) return 200 with text/html
        // instead of the expected JSON — treat that as backend unreachable.
        if (
          event instanceof HttpResponse &&
          req.url.includes('/api/') &&
          !req.url.includes('/api/files/')
        ) {
          const ct = event.headers.get('Content-Type') ?? '';
          if (ct.includes('text/html')) {
            connectivity.markOffline();
          }
        }
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && OFFLINE_STATUSES.has(err.status)) {
          connectivity.markOffline();
        }
      },
    }),
  );
};

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ConnectivityService } from '../services/connectivity.service';

const OFFLINE_STATUSES = new Set([0, 502, 503, 504]);

export const connectivityInterceptor: HttpInterceptorFn = (req, next) => {
  const connectivity = inject(ConnectivityService);
  return next(req).pipe(
    tap({
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && OFFLINE_STATUSES.has(err.status)) {
          connectivity.markOffline();
        }
      },
    }),
  );
};

import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ConnectivityService } from '../services/connectivity.service';

export const connectivityInterceptor: HttpInterceptorFn = (req, next) => {
  const connectivity = inject(ConnectivityService);
  return next(req).pipe(
    tap({
      next: (event) => {
        // Any successful /api/ response cancels a pending offline debounce,
        // preventing navigation-cancelled requests from flipping the banner.
        if (event instanceof HttpResponse && req.url.includes('/api/')) {
          connectivity.cancelOfflineDebounce();
        }
      },
    }),
  );
};

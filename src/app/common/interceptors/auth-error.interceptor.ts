import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppConfigService } from '../services/app-config.service';
import { AuthService } from '../services/auth.service';

/** URL part of the login request, whose 401 the login form handles itself. */
const LOGIN_URL = 'authenticate/user';

/**
 * Handles a 401 of an /api/ request (missing, expired or invalid token): drops the token, then sends the
 * user to the login page (returning to the current page afterwards), or - if the server needs no login -
 * fetches a new anonymous token. The error is passed on to the caller either way.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const appConfig = inject(AppConfigService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.includes('/api/') &&
        !req.url.includes(LOGIN_URL)
      ) {
        auth.logout();
        if (appConfig.snapshot.loginRequired === false) {
          auth.ensureLoggedIn().subscribe();
        } else if (!router.url.startsWith('/login')) {
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }
      return throwError(() => error);
    }),
  );
};

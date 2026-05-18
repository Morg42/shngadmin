import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { map, take, timeout } from 'rxjs/operators';
import { AppConfigService } from '../services/app-config.service';
import { AuthService } from '../services/auth.service';

/**
 * Allows access when:
 *  - the user is already logged in, OR
 *  - the server reports login is not required.
 *
 * Waits up to 3 s for `authReady$` (populated by getServerBasicinfo).
 * On timeout, falls back to false (redirects to /login) to stay safe.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const appConfig = inject(AppConfigService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  return appConfig.authReady$.pipe(
    timeout({ first: 3000, with: () => of(false) }),
    take(1),
    map((loginRequired) => {
      if (!loginRequired) return true;
      if (auth.isLoggedIn()) return true;
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }),
  );
};

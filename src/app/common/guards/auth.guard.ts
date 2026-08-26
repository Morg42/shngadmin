import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap, take, timeout } from 'rxjs/operators';
import { AppConfigService } from '../services/app-config.service';
import { AuthService } from '../services/auth.service';

/**
 * Allows access when:
 *  - the user is already logged in, OR
 *  - the server reports login is not required.
 *
 * Waits up to 3 s for `authReady$` (populated by getServerBasicinfo).
 * On timeout, falls back to false (redirects to /login) to stay safe.
 *
 * When login isn't required, this also waits for AuthService.ensureLoggedIn()
 * before letting the route activate. Anonymous access still needs a real JWT
 * for every backend endpoint except the bare /server/ root - skipping the
 * login *wall* doesn't mean the route's own data calls can skip auth. Letting
 * navigation through immediately (the previous behaviour) let routed
 * components construct and fire their init-time data calls before the
 * anonymous login TopNavigationComponent triggers had actually completed,
 * so those calls silently came back missing every field. Waits up to 3 s
 * here too; either outcome (success or failure/timeout) still allows
 * navigation, since a failed/slow anonymous login shouldn't force a login
 * wall the server said isn't required.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const appConfig = inject(AppConfigService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  return appConfig.authReady$.pipe(
    timeout({ first: 3000, with: () => of(false) }),
    take(1),
    switchMap((loginRequired) => {
      if (loginRequired) {
        if (auth.isLoggedIn()) return of(true);
        return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
      }
      return auth.ensureLoggedIn().pipe(
        timeout({ first: 3000, with: () => of(false) }),
        take(1),
        map(() => true),
      );
    }),
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

/**
 * Blocks a route outside development builds. Used for internal tooling pages
 * (e.g. the button style guide) that have no business shipping to production
 * or being reachable by an end user.
 */
export const devOnlyGuard: CanActivateFn = () => {
  if (!environment.production) {
    return true;
  }
  return inject(Router).createUrlTree(['/']);
};

import { Injector } from '@angular/core';
import { AuthService } from './common/services/auth.service';

/** Returns the <base href> value used as the API root URL. */
export function getBaseUrl(): string {
  return document.getElementsByTagName('base')[0].href;
}

/**
 * JWT options factory.  Retrieves the token lazily via AuthService so that
 * the injector is fully set up before the token getter is called.
 */
export function jwtOptionsFactory(injector: Injector) {
  return {
    tokenGetter: () => {
      const authService = injector.get(AuthService);
      return authService.getToken();
    },
  };
}

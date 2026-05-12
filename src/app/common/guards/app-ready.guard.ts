import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { of } from 'rxjs';
import { map, take, timeout } from 'rxjs/operators';
import { AppConfigService } from '../services/app-config.service';

/**
 * Delays route activation until the server config (wsPort, wsHost, etc.) has
 * been received from /api/server.  Falls back after 5 s so a slow or
 * unreachable backend never blocks navigation permanently.
 */
export const appReadyGuard: CanActivateFn = () => {
  const appConfig = inject(AppConfigService);
  return appConfig.serverReady$.pipe(
    timeout({ first: 5000, with: () => of(appConfig.snapshot) }),
    take(1),
    map(() => true),
  );
};

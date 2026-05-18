/**
 * Shared test helpers and mock factories.
 * Import from spec files to reduce boilerplate.
 */

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

// ---------------------------------------------------------------------------
// Translate helpers
// ---------------------------------------------------------------------------

/** Drop-in stub TranslateLoader — returns an empty translation map. */
export class FakeTranslateLoader implements TranslateLoader {
  getTranslation(_lang: string): Observable<Record<string, string>> {
    return of({});
  }
}

/**
 * Pre-configured TranslateModule.forRoot() with stub loader.
 * Use in TestBed.configureTestingModule({ imports: [translateTestingModule] }).
 */
export const translateTestingModule = TranslateModule.forRoot({
  loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
});

// ---------------------------------------------------------------------------
// Service mock factories
// ---------------------------------------------------------------------------

/** Minimal stub for ServerApiService — never fires HTTP. */
export function createMockServerApiService() {
  return {
    getServerBasicinfo: () => of({}),
    shng_serverinfo: { itemtree_fullpath: true },
  };
}

/** Minimal stub for AppConfigService. */
export function createMockAppConfigService() {
  return {
    apiUrl: '/api/',
    hostIp: 'localhost',
    defaultLanguage: 'en',
    tzname: 'CET',
    tznameDST: 'CEST',
    fallbackLanguageOrder: ['en', 'de'],
    itemtreeFullpath: true,
    itemtreeSearchstart: 3,
    developerMode: false,
    config$: new BehaviorSubject({
      loginRequired: null,
      apiUrl: '/api/',
      defaultLanguage: 'en',
      hostIp: 'localhost',
      wsHost: 'localhost',
      wsPort: '',
      clientIp: '',
      tz: '',
      tzname: 'CET',
      tznameST: 'CET',
      tznameDST: 'CEST',
      coreBranch: '',
      pluginsBranch: '',
      itemtreeFullpath: true,
      itemtreeSearchstart: 3,
      developerMode: false,
      clickDropdownHeader: true,
      fallbackLanguageOrder: ['en', 'de'],
      dataUrl: '',
    }).asObservable(),
    snapshot: { loginRequired: null, apiUrl: '/api/', defaultLanguage: 'en', hostIp: 'localhost' },
    serverReady$: of({ wsPort: '2121' }),
    authReady$: of(false),
    patch: (_partial: unknown) => {},
  };
}

/** Minimal stub for AuthService — always not logged in. */
export function createMockAuthService() {
  return {
    isLoggedIn: () => false,
    loginRequired: () => true,
    loggedIn$: new BehaviorSubject<boolean>(false),
    logout: () => {},
    login: (_creds: unknown) => of(false),
    getToken: () => null,
    isSecuredByLogin: () => true,
  };
}

/** Minimal stub for OlddataService — no WebSocket. */
export function createMockOlddataService() {
  return {
    getValue: (_item: string) => of(null),
    subscribe: () => {},
  };
}

/** Minimal stub for WebsocketService. */
export function createMockWebsocketService() {
  return {
    connect: () => {},
    send: () => {},
    messages$: new BehaviorSubject(null),
    open$: new BehaviorSubject(null),
  };
}

/** Minimal stub for WebsocketPluginService. */
export function createMockWebsocketPluginService() {
  return {
    connect: () => {},
    send: () => {},
    messages$: new BehaviorSubject(null),
  };
}

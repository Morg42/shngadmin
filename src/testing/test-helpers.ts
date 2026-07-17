/**
 * Shared test helpers and mock factories.
 * Import from spec files to reduce boilerplate.
 */

import { signal } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  AttributeCatalogEntry,
  AttributeCatalogService,
  AttributeGroup,
} from '../app/common/services/attribute-catalog.service';

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
    helpLocalAvailable: false,
    coreBranch: 'master',
    pluginsBranch: 'master',
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
      helpLocalAvailable: false,
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

/** Minimal stub for AttributeCatalogService — attributeCatalog/attributeGroups
 *  default empty (loadAttributeCatalog() is a jest.fn(), so nothing populates
 *  them unless the caller passes a pre-built catalog). Pass a catalog to seed
 *  attributeCatalog directly, skipping the merge logic covered separately in
 *  attribute-catalog.service.spec.ts; attributeGroups is derived from it here
 *  (same grouping rules as the real service) since callers rely on both. */
export function createMockAttributeCatalogService(
  catalog: Record<string, AttributeCatalogEntry> = {},
) {
  const bySource = new Map<string, { name: string; entry: AttributeCatalogEntry }[]>();
  for (const [name, entry] of Object.entries(catalog)) {
    if (AttributeCatalogService.ATTRIBUTES_WITH_DEDICATED_FIELDS.includes(name)) continue;
    const list = bySource.get(entry.source) ?? [];
    list.push({ name, entry });
    bySource.set(entry.source, list);
  }
  for (const list of bySource.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  const sources = [...bySource.keys()].sort((a, b) =>
    a === 'core' ? -1 : b === 'core' ? 1 : a.localeCompare(b),
  );
  const attributeGroups: AttributeGroup[] = sources.map((source) => ({
    source,
    entries: bySource.get(source)!,
  }));

  return {
    attributeCatalog: signal(catalog),
    attributeCatalogLoaded: signal(Object.keys(catalog).length > 0),
    attributeGroups: signal(attributeGroups),
    loadAttributeCatalog: jest.fn(),
    attributeDescription: jest.fn().mockReturnValue(''),
    attributeType: jest.fn().mockReturnValue(''),
    attributeValidList: jest.fn().mockReturnValue(undefined),
    // Callable, not a getter - the real service exposes this as a computed()
    // signal, so consuming templates call it as itemTypeOptions().
    itemTypeOptions: () => (catalog['type']?.valid_list ?? []).map((t) => ({ label: t, value: t })),
  };
}

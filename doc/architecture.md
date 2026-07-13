# shngAdmin — Architecture Guide

> **Audience**: A Python developer who understands how web applications work conceptually, but is new to Angular and TypeScript.  This guide assumes you can read code but do not yet know Angular idioms.
>
> **Goal**: By the end you should be able to navigate the codebase confidently, understand why things are structured the way they are, and make changes without breaking the parts you didn't touch.

---

## Table of Contents

1. [Big Picture](#1-big-picture)
2. [Technology Stack](#2-technology-stack)
3. [Application Bootstrap Sequence](#3-application-bootstrap-sequence)
4. [Angular Fundamentals (the 30-second version)](#4-angular-fundamentals-the-30-second-version)
5. [Component Tree](#5-component-tree)
6. [Service Layer](#6-service-layer)
7. [Authentication](#7-authentication)
8. [Route Guards](#8-route-guards)
9. [WebSocket Layer](#9-websocket-layer)
10. [HTTP Pipeline](#10-http-pipeline)
11. [Reactive State: Signals and Observables](#11-reactive-state-signals-and-observables)
12. [Change Detection: Zoneless + OnPush](#12-change-detection-zoneless--onpush)
13. [Theming (Light / Dark / System)](#13-theming-light--dark--system)
14. [Internationalisation (i18n)](#14-internationalisation-i18n)
15. [Feature Modules In Depth](#15-feature-modules-in-depth)
16. [Data Models](#16-data-models)
17. [Testing Approach](#17-testing-approach)
18. [Development Setup and Tooling](#18-development-setup-and-tooling)
19. [Where to Make Common Changes](#19-where-to-make-common-changes)

---

## 1. Big Picture

shngAdmin is a **Single-Page Application (SPA)** that runs entirely in the browser.  It is the administrative front-end for the [SmartHomeNG](https://www.smarthomeng.de/) home-automation server.

The server (written in Python) exposes two interfaces:
- A **REST API** at `/api/` for configuration reads and writes.
- A **WebSocket endpoint** for real-time metric streaming and item-value subscriptions. Host and port are not fixed — they're read from the server's own config and delivered to the browser at startup (see Section 3).

The Angular app communicates with both, renders the results as interactive pages, and sends commands back (restart server, save a logic file, change a setting, etc.).

```
Browser                              SmartHomeNG Python server
  ┌──────────────────────┐              ┌────────────────────┐
  │  Angular SPA         │──HTTPS REST─▶│  REST API  /api/   │
  │  shngAdmin           │◀─────────────│                    │
  │                      │              │                    │
  │                      │◀─WebSocket──▶│  WS Server         │
  └──────────────────────┘              └────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Role |
|---|---|---|
| Language | TypeScript 5.9 | Compiled to JavaScript; adds static types |
| Framework | Angular 21 (**zoneless**) | Component framework, DI, routing, HTTP — no `zone.js` (see Section 12) |
| UI components | PrimeNG 21 | Ready-made UI widgets (dialogs, tabs, tree, pick-list…) — but most list *tables* are plain HTML `<table>` with Bootstrap classes, not PrimeNG's `p-table` (see Section 15) |
| Icons | PrimeIcons + FontAwesome (`@fortawesome/angular-fontawesome` 4) | Icon fonts |
| Charts | Chart.js 4 | Canvas-based graphs for system metrics |
| Code editing | CodeMirror 6 | Embedded editor (Python, YAML, JS, XML) |
| Translation | ngx-translate | Runtime language switching (en/de/fr, plus partial da/fi/nb/nl/sv) |
| Auth tokens | @auth0/angular-jwt | JWT decode, expiry check, attaches the `Authorization` header via DI |
| Hashing | js-sha512 | SHA-512 password hashing before sending |
| Testing | Jest 30 + jest-preset-angular (**zoneless** test environment) | Unit tests; runs in Node (no browser needed) |
| Linting | ESLint + angular-eslint | Code quality |
| Formatting | Prettier | Consistent code style |
| Git hooks | Husky + lint-staged | Auto-format, type-check and test on commit |

**TypeScript vs Python**: TypeScript is structurally typed — the compiler checks that objects have the right fields and method signatures, but at runtime it is plain JavaScript.  Interfaces (like `ServerInfo`) are compile-time only; they vanish after compilation.

---

## 3. Application Bootstrap Sequence

"Bootstrap" here means everything that happens from the moment the browser downloads the page until the first feature screen is visible.

### 3.1 Browser loads `index.html`

Angular's build tool (`@angular/build`, esbuild-based) produces a single `index.html` that references bundled JavaScript files.  The browser fetches and executes them.

There is **no `zone.js`** in this bundle.  Older Angular apps loaded it first to patch every async browser API (`setTimeout`, `Promise`, `fetch`, WebSocket) so the framework could tell when to re-render.  This app doesn't need that — see Section 12.

### 3.2 `main.ts` — `bootstrapApplication`

This is the entry point, equivalent to Python's `if __name__ == '__main__'`.  It calls `bootstrapApplication(AppComponent, { providers })`, which:
- Creates Angular's **dependency-injection container** (called the "injector").  Think of it as a dict that maps class names to singleton instances.
- Registers `provideZonelessChangeDetection()` — the change-detection strategy for the whole app (Section 12).
- Registers all **root-level providers**: the Router, translation service, JWT module, PrimeNG theme, HTTP client, and a few singleton services.
- Runs two `APP_INITIALIZER`s **in parallel, before the router starts its first navigation**:
  1. `ServerApiService.getServerBasicinfo()` — `GET /api/server/`. Critically, this single response patches `loginRequired`, `wsHost`, and `wsPort` into `AppConfigService` all at once. Doing this as an `APP_INITIALIZER` (rather than from a component's `ngOnInit`, which is how it used to work) means the router's own guards never have to wait on a component to even exist first.
  2. `ServerApiService.checkForUpdate()` — `HEAD`s `index.html`, compares its `ETag`/`Last-Modified` fingerprint against the one cached from the previous load (`localStorage['shng.index_fingerprint']`). If they differ, a new build has been deployed since this tab last loaded, and the page force-reloads via a cache-busting URL.
- Renders `AppComponent` into the `<app-root>` element in `index.html`.

### 3.3 Singleton services instantiate

Before any component runs, Angular creates root-provided services as they're first injected. The important ones for startup:

**`AppConfigService`** — creates a `BehaviorSubject<AppConfig>` seeded with safe defaults.  Language is pre-populated from the user's saved preference (`UserPreferencesService`, `localStorage`) so the UI renders in the right language even before the server responds.

**`ServerApiService`** (constructor) — reads `window.location` to build the `apiUrl` string (e.g. `http://192.168.1.10:8383/api/`), and patches this into `AppConfigService`.

**`ConnectivityService`** (constructor) — waits for `AppConfig.ready$` (emits once `apiUrl` is set), then starts the heartbeat timer.

**`AuthService`** (constructor) — checks `sessionStorage['token']`.  If found and not expired, marks the user as logged in immediately, without a network round-trip.

### 3.4 `AppComponent` renders

Angular creates the root component. Its template hosts `<app-top-navigation>`, `<app-offline-banner>`, and `<router-outlet>` — all present from the first frame.

### 3.5 `TopNavigationComponent` renders (in parallel)

Fires a second, fuller request:

```
GET /api/server/info   →   full ServerInfo  { tz, branches, itemtree settings, developer_mode, … }
```

The response patches the remaining `AppConfigService` fields not already covered by the `APP_INITIALIZER`'s basic-info call. `TopNavigationComponent` also calls `WebsocketPluginService.connect()` at this point — by now `wsHost`/`wsPort` are already known.

### 3.6 Router activates the first route

The Router tries to activate `/system` (the default redirect from `/`). It runs the guards first:
1. `appReadyGuard` — checks `AppConfigService.snapshot.loginRequired !== null`. Because the `APP_INITIALIZER` in 3.2 already resolved before the router started, this is almost always already `true` and the guard passes synchronously with no wait at all. A 1-second fallback timeout exists only for the rare case where the guard is evaluated before that `APP_INITIALIZER` has finished.
2. `authGuard` — checks login state / `authReady$` (3-second timeout, falls back to redirecting to `/login`).

Once both pass, Angular downloads the `system` feature chunk and renders the system dashboard.

---

## 4. Angular Fundamentals (the 30-second version)

### Components

A **component** is a Python class with a decorator that links it to an HTML template and a CSS file. When Angular renders the component, it evaluates the template (data binding, loops, conditionals) and produces DOM nodes.

Every component in this app uses **signals** for its reactive state and `ChangeDetectionStrategy.OnPush` — there is no other pattern in use (see Section 12 for why this matters more here than in a typical Angular app).

```typescript
@Component({
  selector: 'app-items',       // use as <app-items> in HTML
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ...],  // what this component uses (standalone, no NgModules)
})
export class ItemsComponent implements OnInit {
  private readonly apiService = inject(ItemsApiService);  // DI: get singleton

  readonly items = signal<Item[]>([]);   // reactive state — a getter-like function

  ngOnInit() {  // called once after the component is created
    this.apiService.getItems().subscribe(items => {
      this.items.set(items);   // writing the signal is what triggers a re-render
    });
  }
}
```

In the template, `items` is read as a function call: `{{ items().length }}`, `@for (item of items(); track item.id) { ... }`.

### Dependency Injection

`inject(SomeService)` is how you get singletons. Angular's injector creates `SomeService` once and hands the same instance to every class that asks for it. This is the same concept as Python's dependency-injection containers (e.g. `dependency-injector`), but built into the framework.

### Signals vs. Observables

Both represent "a value that changes over time," but they play different roles here:
- **`signal()`** — a synchronous, always-has-a-current-value container. Reading it (`mySignal()`) inside a template or a `computed()` automatically registers that read as a dependency; Angular knows exactly which views to re-check when it changes. This is the default for component state in this codebase.
- **RxJS Observables** — still used for anything inherently asynchronous or event-stream-shaped: HTTP responses, WebSocket messages, router events, `debounceTime`/`switchMap` pipelines. The bridge between the two is `toSignal()` (Observable → signal, for one-shot or push-based data at a component boundary) and, more rarely, `toObservable()` (signal → Observable).

### Templates

Angular templates are HTML with extra syntax:
- `{{ value }}` — interpolation (like Python f-strings)
- `[property]="expr"` — property binding (one-way, component → DOM)
- `(event)="handler()"` — event binding (DOM → component)
- `@for (item of items(); track item.id) { ... }` — structural control flow (looping)
- `@if (condition) { ... } @else { ... }` — conditional rendering
- `@switch (value) { @case (x) { ... } }` — multi-branch conditional

This app uses the modern `@if`/`@for`/`@switch` block syntax exclusively — the older `*ngIf`/`*ngFor`/`*ngSwitch` structural-directive syntax (which you'll see in most Angular tutorials and in older versions of this app) does not appear anywhere in the current source.

---

## 5. Component Tree

The app renders a fixed shell (`AppComponent`) with a slot (`<router-outlet>`) where the current page's content is swapped in.

### Root shell (`AppComponent`)

Always present. Contains:
- `<app-top-navigation>` — the menu bar
- `<app-offline-banner>` — shown when connectivity is lost
- `<router-outlet>` — where the current page renders
- `<p-toast position="bottom-right">` — PrimeNG toast notification layer

### `TopNavigationComponent`

Renders the horizontal navigation tabs. On init, fetches the full server info and connects the WebSocket. Reflects `AuthService.loggedIn$` to show/hide the login link, and reflects `ThemeService.darkMode$` to keep the light/dark/system toggle's own icon in sync (Section 13).

### `OfflineBannerComponent`

Subscribes to `ConnectivityService.online$` and `ConnectivityService.retryIn$`. When `online$` emits `false`, shows a sticky banner at the top with a countdown to the next reconnect attempt. Provides a "Retry now" button.

### Feature modules

Each area of the admin UI is a separate **lazy-loaded route group**. Angular downloads the JavaScript for that route group only when the user navigates there for the first time. All eight are guarded by `[appReadyGuard, authGuard]` at the top-level route only (child routes deliberately don't repeat the guards — see Section 8).

| Route | Routes file | What it does |
|---|---|---|
| `/system` | `system/system.routes.ts` | Resource-usage dashboard (`SystemComponent`) and core config editor (`SystemConfigComponent`) |
| `/items` | `items/items.routes.ts` | Browse the item tree, view/edit/create/rename/delete items, edit item-definition files, browse structs |
| `/logics` | `logics/logics.routes.ts` | List, group, create, edit, enable/trigger Python logic scripts |
| `/schedulers` | `schedulers/schedulers.routes.ts` | Scheduler fire times (grouped by item/logic/plugin/other) and the Python thread list |
| `/plugins` | `plugins/plugins.routes.ts` | Browse installed plugins, view/edit config, check PyPI requirement status |
| `/scenes` | `scenes/scenes.routes.ts` | View scenes and edit scene definition files |
| `/logs` | `logs/logs.routes.ts` | View log files, configure loggers and log handlers |
| `/services` | `services/services.routes.ts` | YAML checker/converter, eval tester, backup/restore, cache cleanup, functions editor |

A handful of legacy paths (`/item_tree`, `/logics-list`, `/logics-groups`, `/threads`, `/plugins_list`) still redirect to their current locations for old bookmarks.

### Shared components

Located in `src/app/common/components/`:

**`CodeEditorComponent`** — wraps CodeMirror 6. Used everywhere the user edits code or config text: logic source, YAML files, struct/scene/item-definition files. Supports Python, YAML, JavaScript, and XML syntax highlighting, autocomplete, and a full-screen mode (toggled by a button or F11; also attempts the browser's native Fullscreen API, falling back to a CSS overlay if that's unavailable — e.g. inside an iframe).

**`DynamicFieldComponent`** and **`AttributeValueInputComponent`** — items and plugin parameters can be of many different types (number, bool, string, list, dict, IP address, KNX group address, ...). These two components render the right input widget based on the attribute's declared type, so the item/plugin editors don't need a giant `@switch` of their own.

---

## 6. Service Layer

Services are singleton objects that handle data fetching, state management, and cross-cutting concerns. They are created once by the DI container and shared across all components.

### 6.1 `AppConfigService` — the configuration hub

`src/app/common/services/app-config.service.ts`

This service is the **single source of truth for all runtime configuration**. It holds an `AppConfig` object inside a `BehaviorSubject`. Any part of the app can read the current snapshot synchronously, or subscribe reactively to be notified when it changes.

```typescript
// Synchronous read (use when you just need the current value)
const wsPort = this.appConfig.wsPort;

// Reactive read (use when you need to react to future changes)
this.appConfig.config$.subscribe(cfg => { ... });

// Wait until a specific condition is met
this.appConfig.serverReady$.pipe(take(1)).subscribe(() => {
  // wsPort is now available
});
```

`AppConfig` fields: `loginRequired`, `apiUrl`, `dataUrl`, `hostIp`, `wsHost`, `wsPort`, `clientIp`, `tz`, `tzname`, `tznameST`, `tznameDST`, `coreBranch`, `pluginsBranch`, `itemtreeFullpath`, `itemtreeSearchstart`, `developerMode`, `clickDropdownHeader`, `helpLocalAvailable`, `darkModeDefault`, `resourceGraphPeriod`, `restartStopsOnly`, `fallbackLanguageOrder`, `defaultLanguage`.

**Key Observables on AppConfigService:**

| Observable | Emits when | Used by |
|---|---|---|
| `ready$` | `apiUrl` is set (ServerApiService ctor) | ConnectivityService |
| `serverReady$` | `wsPort` is set | Anything gating on the WebSocket being connectable |
| `authReady$` | `loginRequired` is set | `appReadyGuard`, `authGuard` |
| `config$` | any `patch()` call | anything needing reactive config |

### 6.2 `ServerApiService`

`src/app/common/services/server-api.service.ts`

Handles HTTP calls about the server itself:

- `getServerBasicinfo()` — `GET /api/server/` — called from an `APP_INITIALIZER` before routing starts; patches `loginRequired`, `wsHost`, `wsPort`, `clientIp` (see Section 3.2).
- `getServerinfo()` — `GET /api/server/info` — full config; patches the rest of `AppConfig` (tz, branches, developer mode, etc).
- `getShngServerStatus()` — `GET /api/server/status/` — polled by the Services page.
- `restartShngServer()` — `PUT /api/server/restart/`.
- `getSystemStats()` — `GET /api/system/info`.
- `getPypiInfo()` — `GET /api/server/pypi`.
- `downloadConfigBackup()` — `GET /api/files/backup/` (blob response).
- `checkForUpdate()` — stale-build detection, see Section 3.2.

### 6.3 `AuthService`

`src/app/common/services/auth.service.ts`

Manages the JWT lifecycle. See Section 7 for the full auth flow.

Key public API:
- `isLoggedIn()` — synchronous check; also triggers token renewal if the token is past the halfway point of its lifetime.
- `login(credentials)` — returns `Observable<boolean>`.
- `logout()` — clears token from memory and `sessionStorage`.
- `loggedIn$` — `BehaviorSubject<boolean>`; `TopNavigationComponent` subscribes to update the UI.
- `getToken()` — read by the JWT module's `tokenGetter` (Section 10.1).

### 6.4 `ConnectivityService`

`src/app/common/services/connectivity.service.ts`

Monitors whether the SHNG server is reachable. Runs a silent heartbeat `GET /api/server/` every 10 seconds. When a request fails (status 0 = network unreachable), it starts a debounce timer (1.5 s) before declaring the server offline, because a cancelled XHR (e.g. Angular destroying a component) also produces status 0.

On going offline: stops the heartbeat, starts an exponential-backoff retry sequence (2 → 4 → 8 → 16 → 30 seconds). Publishes countdown ticks on `retryIn$`.

Public Observables:
- `online$` — `BehaviorSubject<boolean>`: `OfflineBannerComponent` subscribes to show/hide.
- `retryIn$` — `BehaviorSubject<number>`: countdown in seconds shown in the banner.

### 6.5 `LogService`

`src/app/common/services/log.service.ts`

Wraps `console.log`, `console.warn`, and `console.error`. In production builds, `log()` and `debug()` calls are silenced; `warn()`/`error()` always go through. Always use `LogService` instead of `console.log` directly, so logs don't leak into production.

### 6.6 `ThemeService`

`src/app/common/services/theme.service.ts`

Owns the light/dark/system theme preference. See Section 13 for the full picture. Public API: `preference$`/`darkMode$` (Observables), `preference`/`darkMode` (getters), `setPreference(pref)`, `cycle()` (Light → Dark → System → Light, used by the compact mobile toggle), `applyServerDefault()`.

### 6.7 `SharedService`

`src/app/common/services/shared.service.ts`

A grab-bag of utilities with no HTTP calls of its own:
- `ageToString()`, `displayDateTime()` — human-readable time formatting.
- `is_knx_groupaddress()`, `is_ipv4()`, `is_ipv6()`, `is_mac()`, `is_hostname()` — validators used by config/plugin parameter forms.
- `getDescription(dict)` — picks the right language out of a `{de:..., en:..., fr:...}` description object, following the fallback language order.
- `setGuiLanguage()` — switches the active `TranslateService` language.
- `monitoredItemsList` — a `signal` holding the item-tree's live-monitored items. It lives here (a root singleton), not on `ItemTreeComponent` or `WebsocketPluginService`, because both of those are destroyed and recreated on navigation — this is what lets the monitored-items table survive navigating away and back, and (via a `localStorage['shng.items.monitored']` mirror, paths only) survive a full page reload too.

### 6.8 `UserPreferencesService`

`src/app/common/services/user-preferences.service.ts`

Reads and writes a single `localStorage` key (`'shngadmin_prefs'`, one JSON blob) holding the user's language and theme preference. Seeded into `AppConfigService`/`ThemeService` at startup so both are correct before the server responds.

### 6.9 Domain API services

`src/app/common/services/*-api.service.ts`

There are 14 of these, one per backend domain. They all follow the same pattern:

```typescript
@Injectable({ providedIn: 'root' })
export class ItemsApiService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  getItemTree() {
    return this.http.get(this.appConfig.apiUrl + 'items/tree');
  }

  changeItemValue(itemPath: string, value: unknown) {
    return this.http.put(this.appConfig.apiUrl + 'items/' + itemPath, { value });
  }
}
```

Each service injects `HttpClient`, reads `apiUrl` from `AppConfigService` to build URLs, returns Observables, and holds no state of its own (no caching, no properties beyond the injected deps).

| Service | Backend domain |
|---|---|
| `ItemsApiService` | `/api/items/` — tree, list, details, create/edit/rename/delete, references |
| `LogicsApiService` | `/api/logics/` — list, state control, groups, parameters |
| `PluginsApiService` | `/api/plugins/` (read) and `/api/plugin/{name}/` (write) — config CRUD, state control |
| `ScenesApiService` | `/api/scenes/` — list, reload |
| `SchedulersApiService` | `/api/schedulers/` |
| `ThreadsApiService` | `/api/threads/` |
| `LogsApiService` | `/api/logs/` — file list, chunked reading |
| `LoggersApiService` | `/api/loggers/` — CRUD, levels, handler assignment |
| `ServicesApiService` | `/api/services/` — eval checker, YAML checker/converter, cache orphans |
| `ConfigApiService` | `/api/config/` — core `smarthome.yaml`, `etc/`-migration check |
| `FilesApiService` | `/api/files/{type}/` — generic read/write/delete used by every text-file editor |
| `FunctionsApiService` | `/api/functions/` — user-function reload |
| `StructsApiService` | `/api/items/structs/` — struct definitions (note: nested under `items/`, not its own top-level path) |
| `ServerApiService` | see 6.2 |

There is no `OlddataService` or `/admin/*.json` legacy endpoint layer any more — everything goes through `/api/`.

---

## 7. Authentication

shngAdmin uses **JWT (JSON Web Token)** authentication.

### 7.1 How JWT works

A JWT is a signed string that encodes claims (who you are, when it was issued, when it expires). The browser stores it and sends it with every request. The server verifies the signature using its secret key — no session table needed.

Token contents (decoded by `jwtHelper.decodeToken()`): `iat` (issued-at), `exp` (expiry), plus username/role claims.

### 7.2 Password hashing

Passwords are **never sent in plain text**. Before the `POST /api/authenticate/user` request, `AuthService.login()` applies SHA-512 with a fixed salt:

```
username_hash = sha512(username + "shNG0160$")
password_hash = sha512(sha512(password) + "shNG0160$")     ← password is double-hashed
```

Empty username/password (the anonymous-login case) are sent as-is, not hashed.

### 7.3 Token storage

The token lives in `sessionStorage['token']` — it survives page reloads in the same tab but is automatically cleared when the tab is closed. This is a deliberate design choice: closing the browser tab acts as a logout.

### 7.4 Anonymous login

If SHNG is configured with `login_required: false`, the app performs an "anonymous login": a POST with empty (unhashed) credentials. The server still issues a JWT, so the same code path handles both cases.

### 7.5 Token renewal

`isLoggedIn()` is called on every route navigation and (indirectly) on API calls. `renewAfter` is set to the halfway point of the token's lifetime (`iat + ttl/2`); once past it, `renewToken()` fires a `PUT /api/authenticate/renew` with the existing token, and the server returns a fresh one. An `isRenewing` flag prevents overlapping renewal requests. If the server ever returns the *same* token from a renewal call, that's treated as "renewal isn't supported server-side" and further attempts stop.

### 7.6 How the token actually gets attached to requests

There is no hand-written auth interceptor. `@auth0/angular-jwt`'s `JwtModule.forRoot(...)` is registered in `main.ts`, configured via a `jwtOptionsFactory` (`src/app/bootstrap.utils.ts`) that supplies `tokenGetter: () => authService.getToken()` and `allowedDomains: [window.location.hostname]` (same-origin only — tokens are never sent to third-party URLs). It attaches automatically to every matching request via `provideHttpClient(withInterceptorsFromDi(), ...)`.

---

## 8. Route Guards

Guards are functions that run before a route is activated. They can allow, redirect, or block navigation.

All 8 top-level feature routes have:
```typescript
canActivate: [appReadyGuard, authGuard]
```

placed **only on the parent route** — child routes deliberately don't repeat it, or the wait would multiply with every route segment.

### 8.1 `appReadyGuard`

`src/app/common/guards/app-ready.guard.ts`

**Problem it solves**: components need `wsPort` and other server config before they can safely call the API or connect the WebSocket.

**How it works**: fast-path returns `true` synchronously if `AppConfigService.snapshot.loginRequired !== null` — which, because of the `APP_INITIALIZER` described in Section 3.2, is already true by the time routing starts on essentially every real navigation. Falls back to waiting on `authReady$` with a 1-second timeout for the rare edge case where the guard runs before that initializer resolves.

### 8.2 `authGuard`

`src/app/common/guards/auth.guard.ts`

**Problem it solves**: the app might start on a protected route with no token in `sessionStorage`. Redirect to `/login`, but only if login is actually required (SHNG can run without auth).

**How it works**:
1. Fast path: if `auth.isLoggedIn()` returns `true`, pass immediately.
2. Slow path: waits on `authReady$` (3-second timeout, defaults to "login required" on timeout — fails safe).
3. If `loginRequired === false`: pass (anonymous access allowed).
4. Otherwise: return a `UrlTree` for `/login?returnUrl=/original` — Angular redirects automatically.

`LoginComponent` reads the `returnUrl` query parameter after a successful login to navigate back to where the user was trying to go.

---

## 9. WebSocket Layer

The WebSocket connection provides two things:
1. **Real-time item value updates** — when a sensor value changes in SHNG, it is pushed to all subscribed browser clients.
2. **System metric streaming** — CPU load, memory, swap, disk I/O, thread counts — for the live charts on the System dashboard.

### 9.1 `WebsocketService` — the raw transport

`src/app/common/services/websocket.service.ts`

Owns the `WebSocket` object. Responsibilities:
- Connect to `ws://host:wsPort/...` (host/port come from `AppConfigService`, resolved at connect time).
- Expose `messages$` (`Subject<MessageEvent>`) and `open$` (`Subject<void>`) as Observables.
- Queue outgoing messages while the socket is closed; flush them on reconnect.
- Auto-reconnect with exponential backoff: 2 → 4 → 8 → 16 → 30 seconds.

This service still deliberately uses RxJS `Subject`s, not signals — it's the low-level transport layer, and its job is to model an event *stream*, which is what Observables are for. It has nothing to do with the app being zoneless (Section 12): whether a message arrives via a zone-patched callback or a raw native one makes no difference to how signals propagate.

### 9.2 `WebsocketPluginService` — the domain protocol

`src/app/common/services/websocket-plugin.service.ts`

Understands the SHNG WebSocket message protocol. It subscribes to `WebsocketService.messages$` and routes incoming JSON messages by their `cmd` field. Unlike the raw transport, its entire *public* surface is `signal`s — components read `websocketPlugin.systemload()` directly in a template rather than subscribing.

**Connection flow on open:** sends an `identity` message (`{ cmd: 'identity', sw, ver, browser, bver }`) on every connect/reconnect.

**Outgoing message types:**

| cmd | Purpose |
|---|---|
| `identity` | Announce browser info to server |
| `monitor` | Subscribe to item value updates: `{ cmd: 'monitor', items: ['item.path', ...] }` |
| `series` | Request historical data: `{ cmd: 'series', item: 'systemload', start, end, count }` |

**Incoming message types:** `item` (routed to whatever callback is currently registered via `getMonitoredItems()`) and `series` (routed by matching `sid` against each metric's own signal, then `.update()`d).

**Public signals** (all `signal<SeriesData>`): `systemload`, `systemmemory`, `systemswap`, `memory`, `threads`, `workerThreads`, `idleWorkerThreads`, `activeWorkerThreads`, `disk`.

**Data normalisation**:
- Timestamps from the server are in seconds; JavaScript `Date` uses milliseconds — the service multiplies by 1000.
- Memory values are in bytes from the server; the service divides to display in MB.

### 9.3 Item monitoring

`ItemTreeComponent.monitorItem(path, true)` calls `WebsocketPluginService.getMonitoredItems(paths, callback)`, registering a callback that writes into `SharedService.monitoredItemsList` (a signal — see 6.7) on every incoming `item` message. Because that list lives on a root singleton and mirrors itself to `localStorage`, the monitored-items table keeps working correctly across both in-app navigation and a full page reload, re-subscribing to the same paths as soon as the WebSocket reconnects.

### 9.4 Why two services?

`WebsocketService` only knows about raw WebSocket mechanics. `WebsocketPluginService` only knows about SHNG's domain protocol. This separation means you can test the protocol layer by feeding it fake `MessageEvent` objects without needing a real WebSocket connection.

---

## 10. HTTP Pipeline

Every HTTP request passes through a chain of interceptors before it reaches the network, and through the same chain (in reverse) on the way back.

### 10.1 JWT attachment (`@auth0/angular-jwt`)

Not a file under `common/interceptors/` — it's a DI-registered module (see Section 7.6). Automatically injects the `Authorization: Bearer <token>` header on every same-origin request.

### 10.2 Connectivity Interceptor

`src/app/common/interceptors/connectivity.interceptor.ts`

The only hand-written interceptor in the app, a **functional interceptor** (the modern Angular style):

```typescript
export const connectivityInterceptor: HttpInterceptorFn = (req, next) => {
  connectivity.cancelOfflineDebounce();  // a request is going out — we're probably online
  return next(req).pipe(
    catchError(err => {
      if (err.status === 0) {    // status 0 = network failure (not an HTTP error code)
        connectivity.markOffline();
      }
      return throwError(() => err);  // re-throw so the caller's error handler fires
    })
  );
};
```

The `cancelOfflineDebounce()` call handles a subtle case: Angular destroys a component (e.g. navigating away), which cancels any in-flight HTTP requests. Those cancellations also produce status 0. The debounce (1.5 s window, owned by `ConnectivityService`) prevents this from falsely triggering the offline banner: if the *next* page's requests succeed, the timer is cleared and the banner never shows.

### 10.3 URL construction

API services don't hard-code host:port. They read `appConfig.apiUrl`, built from `window.location` at startup:

```
apiUrl = "http://" + window.location.hostname + ":" + window.location.port + "/api/"
```

In development, a proxy (`proxy.conf.js`) forwards `/api/` and `/admin/` requests from `localhost:4200` to the real SHNG server. In production, SHNG serves the Angular app at the same origin, so no proxy is needed.

---

## 11. Reactive State: Signals and Observables

If you are coming from Python, here's a rough mental model:

| Python | Angular |
|---|---|
| a plain module-level variable, but every read/write is tracked | `signal()` |
| `@functools.cached_property` that recomputes when its inputs change | `computed()` |
| `asyncio.Queue` | `Subject` |
| `asyncio.Queue` with last-value memory | `BehaviorSubject` |
| `async for item in queue` | `.subscribe(item => ...)` |
| `asyncio.gather(...)` | `forkJoin(...)` / `combineLatest(...)` |
| `async with resource` | `takeUntilDestroyed(destroyRef)` |

### The house patterns used throughout this codebase

**One-shot fetch at a component boundary:**
```typescript
readonly items = toSignal(
  this.itemsApi.getItems().pipe(map(response => response ?? [])),
  { initialValue: [] },
);
```
`toSignal()` subscribes when the signal is first read and unsubscribes automatically when the component is destroyed — no `DestroyRef`, no manual `markForCheck()`.

**Refetch-after-action:**
```typescript
private readonly refresh$ = new Subject<void>();
readonly items = toSignal(
  merge(of(undefined), this.refresh$).pipe(switchMap(() => this.itemsApi.getItems())),
  { initialValue: [] },
);
save() {
  this.itemsApi.save(...).subscribe(() => this.refresh$.next());
}
```

**Derived, sortable/filterable view:**
```typescript
readonly sortField = signal('');
readonly filtered = computed(() =>
  [...this.items()].filter(i => i.name.includes(this.filterText())),
);
```
Always a pure `computed()` over a *copy* — never an in-place `.sort()`/mutation of the source array.

**Async subscription that still needs a persistent, user-mutable field:**
```typescript
private readonly destroyRef = inject(DestroyRef);
readonly myEditFilename = signal('');

ngOnInit() {
  this.someApi.getSomething().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(response => {
    this.myEditFilename.set(response.filename);
  });
}
```
`takeUntilDestroyed(this.destroyRef)` still matters for RxJS subscriptions themselves (an Observable pipeline doesn't know to stop just because nothing reads its signal any more) — it automatically unsubscribes when the component is destroyed, no manual `ngOnDestroy` needed.

### The `async` pipe

Templates can still subscribe directly:
```html
@if (data$ | async; as data) {
  <div>{{ data.value }}</div>
}
```
This auto-unsubscribes on destroy, but is used less often than `toSignal()` in this codebase — converting to a signal at the component boundary keeps the rest of the component's logic signal-based too.

---

## 12. Change Detection: Zoneless + OnPush

This app runs **without `zone.js`** (`provideZonelessChangeDetection()` in `main.ts`), and every component uses `ChangeDetectionStrategy.OnPush`.

### What that combination means in practice

Older Angular apps load `zone.js`, which monkey-patches every async browser API (`setTimeout`, `Promise`, `fetch`, WebSocket, DOM events...). Whenever *any* of those fires, anywhere, Zone.js tells Angular "something might have changed — check everything." That's a blunt, effective safety net, but it means components re-render far more often than necessary, and — worse for readability — imperative code that sets `this.foo = bar` and forgets to call `this.cdr.markForCheck()` will *often* still appear to work, because some unrelated zone tick happens to sweep through and pick up the change. The bug only shows up later, unpredictably, when that lucky tick doesn't happen to occur.

Without zone.js, there is no such safety net. A component only re-renders when:
1. A `signal()` it reads (directly, or via a `computed()`) is written to.
2. A DOM event bound in its own template fires (click, input, etc. — Angular's renderer always schedules a check for these, zoneless or not).
3. An Observable used via the `async` pipe emits.
4. Something explicitly calls `ChangeDetectorRef.markForCheck()`/`detectChanges()`.

**This is why the codebase writes to signals rather than plain fields.** `this.items.set(data)` inside an HTTP subscribe callback is not just "idiomatic" here — it is the *only* thing that reliably tells Angular to re-render, because there's no zone tick left to accidentally bail you out. A plain `this.items = data` would compile fine, the field would hold the right value, and the screen would simply never update.

### The one exception

`TopNavigationComponent` has a single `this.cdr.detectChanges()` call, keeping the theme-toggle icon in sync with `ThemeService.darkMode$`. It's `detectChanges()` rather than `markForCheck()` deliberately: this fires from deep inside an async chain where the icon was verified to sometimes still show stale state with `markForCheck()` alone, because there's no guaranteed later tick to flush the dirty flag. This is the *only* manual change-detection call left anywhere in the app — everything else is signals.

### Debugging a "component not updating" issue

1. Check that the value is being written to a `signal()` (`.set()`/`.update()`), not a plain field.
2. Check that the template actually reads the signal as a function call (`{{ items() }}`, not `{{ items }}`).
3. Check that an RxJS subscription (if any) is actually still alive — a missing `takeUntilDestroyed()` won't cause a *stale* view, but a subscription that never fired at all will.
4. Don't add `ChangeDetectorRef` and a manual `markForCheck()` call as a fix — if you're reaching for it, something upstream should be a signal instead. The one legitimate exception above is exhaustively documented as to why it exists; a new one almost certainly means a bug elsewhere.

---

## 13. Theming (Light / Dark / System)

`src/app/common/services/theme.service.ts`

The user picks between three states via the navbar toggle: **Light**, **Dark**, or **System** (follow the OS's `prefers-color-scheme`, live — a listener on `window.matchMedia('(prefers-color-scheme: dark)')` reacts immediately if the OS setting changes while the tab is open).

- The chosen preference is persisted client-side only, in `UserPreferencesService`'s `localStorage['shngadmin_prefs']` blob (field `themePreference`) — it is **never sent to the server**.
- If `matchMedia` isn't supported at all (very old browsers), "System" falls back to the server's own configured default (`AppConfigService.darkModeDefault`, from SHNG's `etc/module.yaml` `admin.dark_mode` setting).
- The resolved boolean (`darkMode$`) is applied as a single `.dark-mode` class on `<html>`. Two independent things key off that class:
  1. This app's own `--shng-*` CSS custom properties (`src/styles.css`, the `.dark-mode { ... }` block) — semantic colors, borders, hover states.
  2. PrimeNG's own component styling, via `darkModeSelector: '.dark-mode'` passed to `providePrimeNG()` in `main.ts` — the `.dark-mode` selector is explicit specifically because dark mode here is a user choice, not automatically inferred from the OS at the framework level (that's handled one layer up, by `ThemeService`, feeding the same class either way).

When adding new custom CSS that needs to differ between themes, add it under the existing `.dark-mode { ... }` block in `styles.css` rather than introducing a second mechanism — see that block's own comment for what it deliberately does and doesn't cover (it does not touch PrimeNG's own component internals, which get their dark variants from the preset, or the small number of legacy plugin-webinterface styles reserved for third-party markup).

---

## 14. Internationalisation (i18n)

Translation is handled by `@ngx-translate`. Translation files are JSON files in `src/assets/i18n/`:

- `en.json` — English (default)
- `de.json` — German
- `fr.json` — French
- `da.json`, `fi.json`, `nb.json`, `nl.json`, `sv.json` — partial Scandinavian/Dutch translations

### Language selection cascade

1. Check the saved preference in `localStorage['shngadmin_prefs']`.
2. If no preference, ask the server for its configured `default_language`.
3. If the server language is not supported, fall back using `fallbackLanguageOrder` (default: `['en', 'de']`).

### Using translations in code

In templates:
```html
<h2>{{ 'ITEMS.TITLE' | translate }}</h2>
<button>{{ 'COMMON.SAVE' | translate }}</button>
```

In component code:
```typescript
const label = this.translate.instant('ITEMS.SEARCH_PLACEHOLDER');
```

### Adding/updating translations

1. Add the key to `en.json` (and other language files).
2. Use the key in templates or components.
3. Run `npm run i18n:extract` to scan the source and update all JSON files with missing keys.

---

## 15. Feature Modules In Depth

### System (`src/app/system/`)

`SystemComponent` — resource-usage dashboard: license text, plugin/documentation/testsuite package status (from PyPI), and real-time charts (CPU load, memory, swap, disk, threads, worker threads) fed by `WebsocketPluginService`'s signals into Chart.js instances.

`SystemConfigComponent` (`/system/config`) — editor for SHNG's core `etc/*.yaml` config, plus a check/enable flow for the newer `etc/`-based config layout, and a restart-core button.

### Items (`src/app/items/`)

`ItemTreeComponent` (`/items`) — the core of SHNG's data model. Items are variables representing sensor readings, actuator states, and computed values, arranged in a dotted hierarchy (`env.core.threads`, etc.). This is the largest component in the app:
- Left panel: a PrimeNG `p-tree` of the full item hierarchy, with path/name filtering and expand/collapse-all.
- Right panel: selected item's full details (value, type, update/change timestamps and who caused them, eval/trigger/cron config), with an inline value editor.
- Create / Edit / Rename-or-move / Delete dialogs, each with its own validation (e.g. delete offers to clean up references to the item found elsewhere in the config; rename can auto-create missing ancestor items).
- A monitored-items tab: pin any item to watch its live value via the WebSocket, independent of tree navigation — see Section 9.3 for how that survives navigation and reload.

Also in this folder: `ItemConfigurationComponent` (`/items/config`, raw item-definition YAML file editor), `StructsComponent` and `StructConfigurationComponent` (struct browsing/editing), and `AttributeValueInputComponent` (shared type-aware input, also used by the plugin config editor).

### Logics (`src/app/logics/`)

Logics are Python scripts that run inside SHNG.
- `LogicsListComponent` (`/logics`) — table of user and system logics, grouped, with per-logic trigger/enable/disable/load/unload/reload/delete actions.
- `LogicsGroupsComponent` (`/logics/groups`) — create/edit/merge logic groups.
- `LogicsEditComponent` (`/logics/edit/:logicname`) — full-screen CodeMirror editor for the logic's Python source, plus a parameter table (via `DynamicFieldComponent`) for its declared config parameters. Save failures surface as sticky PrimeNG toast notifications via `MessageService`.

### Plugins (`src/app/plugins/`)

`PluginsComponent` (`/plugins`) — installed plugin instances overview: state, version, links to each plugin's own web interface if it has one.

`PluginConfigComponent` (`/plugins/config`) — the configuration editor for a single plugin section, using `DynamicFieldComponent` for the same reason as items: plugin parameters can be of many declared types.

### Scenes (`src/app/scenes/`)

`ScenesComponent` (`/scenes`) — scene groups, their possible values, and per-value action lists; reload one scene or all of them.

`SceneConfigurationComponent` (`/scenes/config`) — scene definition file editor.

### Schedulers (`src/app/schedulers/`)

`SchedulersComponent` (`/schedulers`) — scheduled task info, split into tabs by group (item / logic / plugin / other / trigger).

`ThreadsComponent` (`/schedulers/threads`) — the Python thread list with a live count.

### Logs (`src/app/logs/`)

`LogDisplayComponent` (`/logs`, `/logs/display`, `/logs/display/:logname`) — paginated, chunked log file viewer with filtering and a full-screen mode.

`LoggerListComponent` (`/logs/logger-list`) — logger table (plugin/logic/item/advanced categories), per-logger level and handler assignment, create/delete.

`LoggingConfigurationComponent` (`/logs/logging-configuration`) — `logging.yaml` file editor.

### Services (`src/app/services/`)

`ServicesComponent` (`/services`) — a catch-all admin page: YAML syntax checker and converter, Python `eval` expression tester, SHNG status display with live polling, restart button, password hash generator, config backup download/restore, and orphaned-cache-file cleanup.

`FunctionConfigurationComponent` (`/services/functions`) — user-function file editor with per-function and reload-all buttons.

---

## 16. Data Models

TypeScript interfaces in `src/app/common/models/` define the shape of server responses. They have no runtime presence — they exist only to help the compiler catch typos; there is no runtime validation of API responses against them.

Key models:

**`ServerInfo`** (`server-info.ts`) — the full `/api/server/info` response shape: `login_required`, `default_language`, `fallback_language_order`, `client_ip`, `itemtree_fullpath`, `itemtree_searchstart`, `tz`/`tzname`/`tznameST`/`tznameDST`, `core_branch`, `plugins_branch`, `websocket_host`, `websocket_port`, `developer_mode`, `dark_mode`, `resource_graph_period`, `restart_stops_only`, `daemon_knx`/`daemon_ow`/`daemon_mqtt`/`daemon_node_red`, `backup_stem`, `last_backup`, and a few more.

**`ItemDetails`** (`item-details.ts`) — the full item object: `value`, `last_value`, `previous_value`, `change_age`/`update_age` and their "previous" counterparts, `changed_by`/`updated_by`, `eval`, `trigger`/`trigger_condition`, `hysteresis_*`, `on_update`/`on_change`, `cycle`/`crontab`, `config`/`editable_config` (the raw vs. save-safe attribute dicts — see the item-tree code's own comment on why edits must come from `editable_config`, not `config`), `logics` (which logics reference this item), `filename`.

**`LogicsinfoType`** (`logics-info.ts`) — logic metadata: `name`, `enabled`, `loaded` (via `logictype`), `group`, `watch_item`, `cycle`/`crontab`, `pathname`, `userlogic`.

**`PlugininfoType`** (`plugin-info.ts`) — plugin metadata: `pluginname`, `configname`, `version`, `state`, `parameters[]`, `attributes[]`, `metadata` (description/keywords/maintainer/support/version-range), `stoppable`/`stopped`.

**`AppConfig`** (`app-config.service.ts` — not a model file) — the internal config shape, see Section 6.1.

There is no `system-info.ts`/`pypi-info.ts`/`item-details.ts` dependency on the old `/admin/*.json` endpoints any more, even though a few of those files' own doc comments still mention them — the actual HTTP calls all go through `/api/...` now (Section 6.9).

---

## 17. Testing Approach

Tests use **Jest** (not Karma/Jasmine), running **zoneless** — `jest-preset-angular`'s `setupZonelessTestEnv()` (`src/setup-jest.ts`), matching the app's own runtime.  Jest runs in Node.js with a DOM simulation (`jest-environment-jsdom`), so tests are fast — no browser required.

Test files sit next to the source files: `items.component.spec.ts` is in the same directory as `items.component.ts`.

**One consequence of zoneless testing worth knowing up front**: Angular's `fakeAsync()`/`tick()` test helpers require `zone.js` internally, regardless of whether the app under test uses it — they simply don't work in this project. Anywhere a test needs to control time (e.g. an RxJS `timer()`-driven poll), use Jest's own fake timers instead:
```typescript
it('polls after the tab is opened', async () => {
  jest.useFakeTimers();
  component.onTabChange('2');
  await jest.advanceTimersByTimeAsync(0);
  expect(component.data().length).toBeGreaterThan(0);
  jest.useRealTimers();
});
```

### Test helper (`src/testing/test-helpers.ts`)

Provides mock factory functions so you don't repeat boilerplate in every spec:

```typescript
const mockAuth = createMockAuthService({ isLoggedIn: true });
const mockConfig = createMockAppConfigService({ wsPort: '2121' });
```

### Typical component test structure

```typescript
describe('ItemsComponent', () => {
  let component: ItemsComponent;
  let fixture: ComponentFixture<ItemsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ItemsComponent],
      providers: [
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: ItemsApiService, useValue: { getItems: () => of([]) } },
      ],
    });
    fixture = TestBed.createComponent(ItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load items on init', () => {
    expect(component.items()).toEqual([]);
  });
});
```

### Running tests

```bash
npm test              # run all tests once
npm run test:watch    # re-run on file changes (fast feedback loop)
npm run test:coverage # with coverage report
```

---

## 18. Development Setup and Tooling

### Prerequisites

- Node.js 20+ (an even-numbered/LTS release is recommended — the CLI warns on odd-numbered non-LTS versions)
- npm

### Install and run

```bash
npm install          # install all dependencies
npm start             # start dev server at http://localhost:4200
```

### Proxy configuration

`proxy.conf.js` forwards API calls from the dev server to your SHNG instance. Edit the `PROXY_TARGET` constant at the top:

```javascript
const PROXY_TARGET = 'http://192.168.1.10:8383';  // your SHNG address
```

The `secure: false` setting disables TLS certificate verification (necessary for self-signed certs on local SHNG instances). `logLevel: 'debug'` logs full request/response headers including Authorization tokens — **dev only, never in production**.

### Build for production

```bash
npm run build:prod
```

Output goes to `dist/static/` — a set of static files that SHNG's built-in web server serves directly. `build:prod` also stamps the build with a version string (`scripts/generate-version.js`, combining `package.json`'s version with the current git commit and branch) and copies `3rdpartylicenses.txt` into `src/assets/` so the Ressource/Urheberrechtshinweise tab on the System page can display it.

### Code formatting

```bash
npm run format       # format all source files with Prettier
npm run lint          # run ESLint
```

Prettier, `tsc --noEmit`, and the full Jest suite all run automatically on commit (via Husky + lint-staged). **Note**: Jest and `tsc` do not catch Angular template compilation errors — a broken binding in an `.html` file (e.g. a `[target]` accidentally turned into `[target()]` by a careless find/replace) will pass both and only fail `ng build`/`npm run build`. Always run a full build after any template edit before committing.

### Translation extraction

```bash
npm run i18n:extract  # scan sources, update all translation JSON files
```

---

## 19. Where to Make Common Changes

### Add a new API endpoint call

1. Find the relevant service in `src/app/common/services/` (e.g. `items-api.service.ts` for item-related endpoints).
2. Add a new method following the existing pattern:
   ```typescript
   getSpecificThing(id: string) {
     return this.http.get<SpecificThing>(this.appConfig.apiUrl + 'items/' + id + '/something');
   }
   ```
3. Call it from the component, either via `toSignal()` at the component boundary, or with `.subscribe(...)` and `takeUntilDestroyed(this.destroyRef)` if you need an imperative callback (e.g. to trigger a follow-up action).
4. Write into a `signal()`, not a plain field — see Section 12.

### Add a translation key

1. Add the key and English text to `src/assets/i18n/en.json`.
2. Use it: `{{ 'YOUR.KEY' | translate }}` in template or `this.translate.instant('YOUR.KEY')` in code.
3. Run `npm run i18n:extract` to propagate to other language files.
4. Add translations to at least `de.json` if known.

### Add a new feature page

1. Create `src/app/newfeature/` with a component and a routes file.
2. In the routes file: `export const NEWFEATURE_ROUTES: Routes = [{ path: '', component: NewFeatureComponent }];`
3. In `src/app/app.routes.ts` add:
   ```typescript
   {
     path: 'newfeature',
     canActivate: [appReadyGuard, authGuard],
     loadChildren: () => import('./newfeature/newfeature.routes').then(r => r.NEWFEATURE_ROUTES),
   }
   ```
4. Add a nav link in `top-navigation.component.html`.

### Change how a service decides something

1. Find the service.
2. Change the relevant method.
3. Update the service's spec file.
4. Run `npm test` to confirm nothing broke.

### Debug a "component not updating" issue

See Section 12's dedicated checklist.

### Debug "No provider for X" in a test

A service is injected somewhere in the component's dependency chain but not listed in `TestBed.configureTestingModule({ providers: [...] })`. Add a mock:
```typescript
{ provide: MissingService, useValue: createMockMissingService() }
```
Or add the real service if it has no side effects in tests.

---

*Source: `src/` directory of shngAdmin, branch `work`.*

# shngAdmin — How It Works

## Part 1 — What kind of program is this?

Before anything Angular-specific, it helps to know what category of program this is.

shngAdmin is a **Single-Page Application (SPA)**. That means:

- The server sends one HTML file, once, when you first open the browser.
- After that, the browser never loads another page from the server. All navigation happens by JavaScript rewriting the DOM.
- Data comes in and out via HTTP API calls and a WebSocket, just like `requests.get()` in Python, but running inside the browser.

The contrast with a traditional web app (Django, Flask with Jinja templates):

```
TRADITIONAL WEB APP (Django/Flask)
┌────────────────────────────────────────────────────────┐
│ Browser                                                │
│   click "Users" → GET /users/                          │
│                 ← server renders HTML, sends full page │
│   click "Edit"  → GET /users/5/edit/                   │
│                 ← server renders HTML, sends full page │
└────────────────────────────────────────────────────────┘

SINGLE-PAGE APPLICATION (Angular)
┌────────────────────────────────────────────────────────┐
│ Browser                                                │
│   load once   → GET /                                  │
│               ← index.html + all JS bundle             │
│                 (the entire app, pre-compiled)         │
│   click "Items" → JavaScript rewrites the DOM          │
│                   then fires GET /api/items/list/      │
│                ← JSON data only                        │
│   click "Logs"  → JavaScript rewrites the DOM          │
│                   then fires GET /api/logs/             │
│                ← JSON data only                        │
└────────────────────────────────────────────────────────┘
```

The backend (SmartHomeNG's REST API) never knows or cares about page transitions. It only sees JSON API calls.

---

## Part 2 — The Python analogy for Angular concepts

Angular has a handful of main building blocks. Here's how to think about each one if you come from Python.

```
ANGULAR CONCEPT        PYTHON ANALOGY
───────────────────    ───────────────────────────────────────────
Component              A Python class that owns a piece of the UI.
                       It has data attributes and methods, and a
                       template (like a Jinja2 .html file, but
                       tightly coupled to the class).

Signal                 A module-level variable where every read
                       AND write is tracked automatically. Think
                       of it like a property with hidden hooks:
                       reading it inside a template registers "if
                       this changes, re-render me"; writing it
                       fires that registration. You call it like a
                       function to read: mySignal(); you call
                       .set(newValue) to write.

Service                A Python class that does work with no UI.
                       HTTP calls, data transformation, shared
                       state. Injected into components, similar to
                       how you'd pass a db session or a requests
                       Session into a function.

Route / lazy chunk     Like a Python package's __init__.py that
                       registers a URL blueprint, except the
                       browser only downloads that package's
                       JavaScript the first time you navigate to
                       its URL — everything else stays undownloaded
                       until needed.

Template               An HTML file with Angular-specific syntax.
                       Think Jinja2, but instead of {{ var }} for
                       everything, Angular uses:
                         {{ var() }}      → render a signal's value
                         [attr]="expr"    → bind HTML attribute
                         (event)="fn()"   → bind event handler
                         @if (cond) {}    → conditional render
                         @for (x of y) {} → loop
```

**Dependency Injection** is the glue. In Python you'd write:

```python
class LogicsComponent:
    def __init__(self, api_service, logger):
        self.api = api_service
        self.log = logger
```

Angular does the same thing automatically. You declare what you need with `inject()`, and Angular creates or reuses the instances:

```typescript
// Angular
export class LogicsListComponent {
  private readonly logicsApi = inject(LogicsApiService);   // Angular creates this once, injects it
  private readonly router = inject(Router);                 // Angular's built-in router, also injected

  readonly logics = signal<LogicsinfoType[]>([]);            // reactive state
}
```

---

## Part 3 — The overall system architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (shngAdmin Angular App)                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UI Layer (Components + Templates)                       │   │
│  │  system  │  items  │  logics  │  plugins  │  scenes ...  │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │ calls                               │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │  Service Layer                                           │   │
│  │  API Services          Infrastructure Services           │   │
│  │  server-api             auth         connectivity        │   │
│  │  items-api               websocket    app-config         │   │
│  │  logics-api               log          shared            │   │
│  │  plugins-api                theme       user-prefs       │   │
│  │  ... (14 total)                                          │   │
│  └────────┬──────────────────────────┬───────────────────────┘  │
│           │ HTTP (REST)              │ WebSocket                │
└───────────┼──────────────────────────┼──────────────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────────┐   ┌─────────────────────────┐
│  SmartHomeNG REST API │   │  SmartHomeNG WebSocket  │
│  http://host:8383/api │   │  ws://host:<wsPort>/... │
│                       │   │                         │
│  GET  /api/items/...  │   │  Real-time item values  │
│  GET  /api/logics/    │   │  System load/memory/    │
│  PUT  /api/logics/... │   │  disk/thread charts     │
│  POST /api/auth/...   │   │                         │
└───────────────────────┘   └─────────────────────────┘
```

Both `8383` (the REST port) and the WebSocket port come from SmartHomeNG's own config and are loaded dynamically at startup — the Angular app doesn't hardcode either one.

There is no separate "legacy `/admin/` endpoints" layer any more — an older version of this app had one (`OlddataService`), but everything now goes through `/api/`.

---

## Part 4 — How the app starts up (the boot sequence)

This is the first thing that happens when you open the browser. Understanding it makes the rest much clearer.

```
BOOT SEQUENCE
─────────────────────────────────────────────────────────────────

1. Browser loads index.html
   └─ index.html loads the compiled JS bundle (all Angular code)
      Note: there is no zone.js in this bundle — see Part 17.

2. main.ts runs (this is the Python equivalent of if __name__ == '__main__')
   ├─ Registers global providers:
   │    provideZonelessChangeDetection()  (Part 17)
   │    JWT handler   (reads token from sessionStorage for auth headers)
   │    Translation   (loads i18n JSON files from /assets/i18n/)
   │    HTTP client   (Angular's equivalent of requests.Session)
   │    PrimeNG theme (UI component library styling)
   │
   ├─ Runs two APP_INITIALIZERs IN PARALLEL, BEFORE the router's
   │  first navigation even starts:
   │    ServerApiService.getServerBasicinfo()
   │      └─ GET /api/server/
   │         └─ Response contains: wsHost, wsPort, clientIp, loginRequired
   │            └─ AppConfigService.patch({wsHost, wsPort, clientIp, loginRequired})
   │    ServerApiService.checkForUpdate()
   │      └─ HEADs index.html, compares its fingerprint (ETag/Last-Modified)
   │         against the one saved from the previous load. Different?
   │         → force-reload via a cache-busting URL (a new build shipped).
   │
   └─ Boots AppComponent as the root component

3. appReadyGuard (on every top-level route) checks
   AppConfigService.snapshot.loginRequired !== null
   └─ Because step 2's APP_INITIALIZER already finished before routing
      even starts, this is normally already true — the guard passes
      with NO wait on essentially every real navigation. (A 1-second
      fallback exists only for the rare case the guard somehow runs
      before that initializer resolves.)

4. authGuard checks: already logged in (token in sessionStorage)?
   If not, is login even required (loginRequired === false)? If
   neither, redirect to /login?returnUrl=<where you were headed>.

5. Router renders the target route. TopNavigationComponent (part of
   AppComponent's own template, so it's already on screen) separately
   fires GET /api/server/info for the FULL config (timezone, branches,
   developer mode, etc.) and calls WebsocketPluginService.connect().

6. Normal operation: user navigates, components load, each calls its
   own API service.
```

The `AppConfigService` acts like a global config dict shared across the whole app. Steps 2 and 5 populate it. Everything else reads from it.

---

## Part 5 — File and folder layout

```
src/app/
├── app.component.ts/html      ← Root component (top nav bar, router outlet)
├── app.routes.ts               ← URL → component mapping (like urls.py)
├── main.ts                     ← Entry point (like __main__.py)
│
├── common/                     ← Shared across all features
│   ├── services/                ← Business logic, API calls, shared state
│   │   ├── INFRASTRUCTURE:
│   │   │   app-config.service.ts      global config store
│   │   │   auth.service.ts            login/logout/token
│   │   │   connectivity.service.ts    offline detection
│   │   │   websocket.service.ts       raw WebSocket wrapper
│   │   │   websocket-plugin.service.ts  smarthomeng protocol (signals)
│   │   │   theme.service.ts           light/dark/system preference
│   │   │   log.service.ts             logging wrapper
│   │   │   user-preferences.service.ts localStorage prefs
│   │   │   shared.service.ts          formatters, validators,
│   │   │                              AND the monitored-items-list signal
│   │   └── API SERVICES (one per backend domain):
│   │       server-api.service.ts      /api/server/, /api/system/
│   │       items-api.service.ts       /api/items/ (tree, CRUD, references)
│   │       logics-api.service.ts      /api/logics/
│   │       plugins-api.service.ts     /api/plugin(s)/
│   │       scenes-api.service.ts      /api/scenes/
│   │       schedulers-api.service.ts  /api/schedulers/
│   │       threads-api.service.ts     /api/threads/
│   │       logs-api.service.ts        /api/logs/
│   │       loggers-api.service.ts     /api/loggers/
│   │       services-api.service.ts    /api/services/
│   │       config-api.service.ts      /api/config/
│   │       files-api.service.ts       /api/files/ (generic file CRUD)
│   │       functions-api.service.ts   /api/functions/
│   │       structs-api.service.ts     /api/items/structs/
│   │
│   ├── models/                 ← TypeScript interfaces (like Python dataclasses)
│   │   server-info.ts, item-details.ts, item-tree.ts, plugin-info.ts,
│   │   logics-info.ts, scene-info.ts, scheduler-info.ts, thread-info.ts,
│   │   loggers-info.ts, logfiles-info.ts, pypi-info.ts, interfaces.ts ...
│   │
│   ├── guards/                 ← Route access control
│   │   app-ready.guard.ts      waits for the initial server response
│   │   auth.guard.ts           redirects to /login if not authenticated
│   │
│   ├── interceptors/           ← HTTP middleware (like Flask before_request)
│   │   connectivity.interceptor.ts   the only hand-written one
│   │   (JWT header attachment is wired separately, via DI — see Part 11)
│   │
│   └── components/             ← Reusable UI building blocks
│       offline-banner/          shown when API unreachable
│       code-editor/             CodeMirror 6 wrapper (Python/YAML/JS/XML)
│       dynamic-field/           renders a ConfigParameter by type (p-table rows)
│       attribute-value-input/   renders an item attribute by declared type
│
└── FEATURE FOLDERS (each is one nav section):
    ├── system/                 overview, config
    ├── items/                  item tree, item config, structs
    ├── logics/                 logics list + groups + editor
    ├── plugins/                plugin list + config
    ├── scenes/                 scene list + config
    ├── schedulers/              schedulers + threads
    ├── logs/                   log display, logger list, logging config
    └── services/                eval/yaml tools, cache check, functions
```

---

## Part 6 — The service layer in detail

Services are plain TypeScript classes with no templates. They are singletons — Angular creates one instance per service and reuses it everywhere. Think of them as module-level objects in Python.

### Infrastructure services

These are not about SmartHomeNG features. They handle cross-cutting concerns.

```
AppConfigService
────────────────
Like a global dict that the whole app reads from.
Gets populated during boot (Part 4) from the /api/server/ and
/api/server/info responses.

  _config$ = {
    apiUrl:               'http://192.168.1.10:8383/api/',
    wsHost:               '192.168.1.10',
    wsPort:               '2121',
    clientIp:             '192.168.1.50',
    tz:                   'Europe/Berlin',
    developerMode:        false,
    darkModeDefault:      false,
    defaultLanguage:      'de',
    loginRequired:        true,
    ...
  }

Components read: appConfig.developerMode   (typed convenience getters)
Services read:   appConfig.apiUrl          (to build request URLs)
Boot waits on:   appConfig.authReady$      (observable, fires once loginRequired arrives)
```

```
AuthService
───────────
Owns the login session.

  State:
    sessionStorage['token']  ← JWT string
    loggedIn$                 ← BehaviorSubject<boolean>

  login(username, password)
    → hashes: username with SHA-512+salt, password with DOUBLE SHA-512+salt
    → POST /api/authenticate/user
    ← JWT token → stored in sessionStorage
    → decodes JWT to get currentUser (username, expiry, ...)

  renewToken()
    → checks if past the halfway point of the token's lifetime
    → PUT /api/authenticate/renew
    ← new token, replaces old one silently

  isLoggedIn()
    → checks token expiry timestamp
    → triggers renewal if past the halfway point
    → returns true/false
```

```
ConnectivityService
───────────────────
Detects when the SmartHomeNG backend goes offline.

  online$   ← BehaviorSubject<boolean>  (true normally, false when API unreachable)
  retryIn$  ← BehaviorSubject<number>   (countdown seconds until next retry)

  Every 10 seconds: heartbeat GET /api/server/
  On failure:       1.5s debounce → online$ emits false → OfflineBanner appears
  On success:       online$ emits true → OfflineBanner hides
  Retry schedule:   2s → 4s → 8s → 16s → 30s → 30s → ...

  The connectivityInterceptor watches every HTTP response.
  Any successful /api/ response also cancels the offline debounce,
  so normal API calls from components count as heartbeats too.
```

```
WebsocketService  (low level)
─────────────────
Raw WebSocket wrapper. Handles connect, disconnect, reconnect backoff, message
queue. Still built on RxJS Subjects (messages$, open$) — it's modelling a raw
event stream, which is exactly what Observables are for. Not used directly by
components — WebsocketPluginService sits on top of it.

WebsocketPluginService  (SmartHomeNG protocol)
──────────────────────
Speaks the SmartHomeNG WebSocket protocol. Its public state is entirely
signals — components read e.g. websocketPlugin.systemload() directly in a
template, no .subscribe() needed.

  1. MONITORING  (real-time item values)
     getMonitoredItems(itemList, callback)
       → sends:  {cmd: 'monitor', items: ['my.item.path', ...]}
       ← receives updates as item values change
       → invokes callback(data) for each update

  2. SERIES  (historical chart data — feeds the System dashboard)
     getSeriesLoad(period='24h', count=100)
       → sends:  {cmd: 'series', item: 'env.system.load', ...}
       ← receives series data, matched by sid
       → writes into the systemload signal
       → SystemComponent reads that signal directly; the chart redraws

  IMPORTANT: TopNavigationComponent uses the app-wide (root-provided)
  instance of this service. ItemTreeComponent, however, declares its own
  PRIVATE instance in its @Component({ providers: [...] }) — it gets a
  fresh WebsocketPluginService every time you navigate to the item tree,
  which is destroyed again when you navigate away. That's exactly why the
  monitored-items LIST itself doesn't live on this service (it would be
  wiped on every navigation) — it lives on SharedService instead, a true
  root singleton, and is mirrored to localStorage so it also survives a
  full page reload (see the SharedService entry below).
```

```
ThemeService
────────────
Owns the light / dark / system theme choice (the toggle in the top navbar).

  preference$  ← Observable<'light'|'dark'|'system'>
  darkMode$    ← Observable<boolean>          (the resolved boolean)

  setPreference(pref)   → user picks explicitly, saved to localStorage
  cycle()                → Light → Dark → System → Light (compact toggle)

  'system' means: follow window.matchMedia('(prefers-color-scheme: dark)'),
  live — if the OS theme changes while the tab is open, the app follows.

  darkMode$ ultimately just toggles one CSS class, .dark-mode, on <html>.
  Two things key off that class: this app's own --shng-* CSS variables
  (src/styles.css), and PrimeNG's own component theming (darkModeSelector:
  '.dark-mode', configured in main.ts).

  The choice is NEVER sent to the server — purely a client-side preference,
  stored in the same localStorage blob as the language preference
  (UserPreferencesService, key 'shngadmin_prefs').
```

```
SharedService
─────────────
Formatting/validation utilities (no HTTP calls of its own) — PLUS one piece
of real state: the monitored-items list.

  ageToString(seconds)         → "3 days, 4 hours, 12 minutes"
  displayDateTime(isoString)   → "15.03.2025 10:36:52 CET"
  is_knx_groupaddress(str)     → validates "1/2/3" format
  is_ipv4(str), is_ipv6(str), is_mac(str), is_hostname(str) → validators
  getDescription(dict)         → picks the right language from a {de:..., en:..., fr:...} dict
  setGuiLanguage()             → tells TranslateService to switch language

  monitoredItemsList           → signal<[path, data][]>
                                  Root singleton, so it survives item-tree's
                                  own component (and its private
                                  WebsocketPluginService, see above) being
                                  destroyed on navigation. Also mirrored to
                                  localStorage['shng.items.monitored']
                                  (paths only, never stale data) so the list
                                  comes back after a full browser reload too
                                  — item-tree re-fetches fresh values for
                                  each restored path as soon as the
                                  WebSocket reconnects.
```

### API services

One service per SmartHomeNG API domain. Each method is essentially a typed wrapper around one HTTP endpoint.

```
PATTERN (same for all API services):

constructor() {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
}

getLogics(): Observable<LogicsResponse> {
  return this.http.get<LogicsResponse>(this.appConfig.apiUrl + 'logics/')
    .pipe(catchError(() => of({})));
}
        │                │
        │                └── if the request fails, emit empty object instead of crashing
        └── returns an Observable (like a generator, but push-based)
            Caller does: this.logicsApi.getLogics().subscribe(data => { ... })
            or, more commonly in this codebase, wraps it in toSignal() at
            the component boundary (see Part 10).
```

```
API SERVICE MAP

ServerApiService
  getServerBasicinfo()  GET /api/server/           → ServerInfo (boot, APP_INITIALIZER)
  getServerinfo()       GET /api/server/info        → ServerInfo (full, TopNavigationComponent)
  getShngServerStatus() GET /api/server/status/
  restartShngServer()   PUT /api/server/restart/
  getSystemStats()      GET /api/system/info
  getPypiInfo()         GET /api/server/pypi
  downloadConfigBackup()GET /api/files/backup/     → Blob (file download)
  checkForUpdate()       HEAD index.html            → stale-build detection

ItemsApiService
  getItemList()          GET /api/items/list/
  getItemTree()          GET /api/items/tree
  getCoreItemAttributes() GET /api/items/attributes
  getItemDetails(path)   GET /api/items/{path}
  changeItemValue(path)  PUT /api/items/{path}       body {value}
  createItem(path, ...)  POST /api/items/{path}
  editItem(path, config) PATCH /api/items/{path}
  renameItem(path, ...)  POST /api/items/{path}/rename
  deleteItem(path, ...)  DELETE /api/items/{path}?persist=&recursive=
  getItemReferences(path) GET /api/items/{path}/references
  removeReferences(path)  POST /api/items/{path}/remove_references

LogicsApiService
  getGroupsInfo()        GET /api/logics/?infotype=groups
  getLogics()            GET /api/logics/
  getLogic(name)         GET /api/logics/{name}
  getLogicState(name)    GET /api/logics/{name}?infotype=status
  setLogicState(name, action, file?)
                          PUT /api/logics/{name}?action={action}
                          actions: trigger enable disable load unload reload delete create rename
  saveLogicParameters()  PUT /api/logics/{name}?action=saveparameters
  saveLogicGroup()       PUT /api/logics/{group}?action=savegroup
  deleteLogicGroup()     PUT /api/logics/{group}?action=deletegroup

PluginsApiService
  getInstalledPlugins()  GET /api/plugins/installed/
  getPluginsConfig()     GET /api/plugins/config/
  getPluginsInfo()       GET /api/plugins/info/       → PlugininfoType[]
  getPluginsLogicParameters() GET /api/plugins/logicparams/
  getPluginsAPI()         GET /api/plugins/api/
  setPluginConfig()      PUT /api/plugin/{section}/
  addPluginConfig()      POST /api/plugin/{section}/
  deletePluginConfig()   DELETE /api/plugin/{section}/
  setPluginState(name, action)
                          PUT /api/plugin/{name}?action={action}
                          actions: trigger enable disable load unload reload delete create

ScenesApiService
  getScenes()             GET /api/scenes/
  reloadScene(name)       PUT /api/scenes/reload/{name}
  reloadScenes()          PUT /api/scenes/reload/all

SchedulersApiService
  getSchedulers()         GET /api/schedulers/

ThreadsApiService
  getThreads()            GET /api/threads/

LogsApiService
  getLogs()                GET /api/logs/
  readLogfile(file, chunk) GET /api/logs/{file}?chunk={n}

LoggersApiService
  getLoggers()             GET /api/loggers/
  setLoggerLevel(logger, level)  PUT /api/loggers/{logger}?level={level}
  setHandlers(logger, handlers)  PUT /api/loggers/{logger}?handlers={list}
  addLogger(logger)        POST /api/loggers/{logger}/
  deleteLogger(logger)     DELETE /api/loggers/{logger}/

ServicesApiService
  CheckEvalData(expr)     PUT /api/services/evalcheck/    → {expression, type, result}
  CheckYamlText(text)     PUT /api/services/yamlcheck/
  ConvertToYamlText(text) PUT /api/services/yamlconvert/
  getCacheOrphans()       GET /api/services/cachecheck/
  deleteCacheFile(name)   PUT /api/services/cachefile_delete?filename=...

ConfigApiService
  getConfig()              GET /api/config/
  saveConfig(data)         PUT /api/config/core/
  checkConfigEtc()         GET /api/config/check_config_etc/
  enableConfigEtc()        PUT /api/config/enable_config_etc/

FilesApiService  (generic file CRUD, used by every text-file editor)
  readFile(type, name)     GET /api/files/{type}/[?filename=]
  saveFile(type, name, content) PUT /api/files/{type}/[?filename=]
  createFile(type, name, content) POST /api/files/{type}/?filename=   (409 on conflict)
  saveLoggingConfig(content) PUT /api/files/logging/
  deleteFile(type, name)   DELETE /api/files/{type}/[?filename=]
  getfileList(type)        GET /api/files/{type}/    (strips macOS ._* sidecar files)

FunctionsApiService
  getFunctions()            GET /api/functions/
  reloadFunction(name)      PUT /api/functions/reload/{name}
  reloadFunctions()         PUT /api/functions/reload/all

StructsApiService
  getStructs()              GET /api/items/structs/   (note: nested under items/)
```

---

## Part 7 — The TypeScript models (interfaces)

These are the typed shapes of the data that flows between the API and the components. In Python terms, they are equivalent to dataclasses or Pydantic models, but they only exist at compile time — at runtime they are just plain JavaScript objects. There is no validation at runtime, only type checking when you're writing code.

```
ServerInfo
  login_required       bool
  default_language     str
  fallback_language_order  str[]
  client_ip            str
  tz                   str    ('Europe/Berlin')
  tzname               str    ('CET')
  tznameST             str    ('CET')
  tznameDST            str    ('CEST')
  core_branch          str
  plugins_branch       str
  websocket_host       str
  websocket_port       int
  developer_mode       bool
  dark_mode            bool   (server-side default, used only if OS theme detection is unavailable)
  click_dropdown_header bool
  itemtree_fullpath    bool
  itemtree_searchstart int
  help_local_available bool
  resource_graph_period str
  restart_stops_only   bool
  daemon_knx, daemon_ow, daemon_mqtt, daemon_node_red  bool
  backup_stem, last_backup  str
  ...

PlugininfoType  (one per installed plugin instance)
  pluginname           str
  configname            str    (instance name in plugin.yaml)
  version               str
  state                 str    ('running' | 'stopped' | ...)
  smartplugin           bool
  multiinstance         bool
  instancename          str
  webif_url             str    (link to plugin's own web interface)
  parameters[]           PluginParameter[]
  attributes[]           PluginItemAttribute[]
  metadata               PluginMetadata
  stoppable             bool
  stopped               bool

LogicsinfoType  (one per logic)
  name                  str
  pathname               str
  userlogic              bool
  group                  str
  enabled                bool
  loaded                 bool  (derived from logictype)
  watch_item[]            LogicsWatchItem[]
  cycle, crontab          str

LogicsGroupType
  name                  str
  title                  str
  description            str

SceneInfo
  path                  str
  name                  str
  value_list[]           str[]
  scene_path[]            str[]
  values[]                SceneValue[]

ItemTreeNode
  path                  str
  name                   str
  tags[]                 int[]
  nodes[]                ItemTreeNode[]   ← recursive

ItemDetails
  value, last_value, previous_value
  type
  config, editable_config   (raw vs. save-safe attribute dicts — edits must
                              always come from editable_config, never config,
                              or a save silently resets core attributes to
                              their defaults)
  eval, trigger, trigger_condition
  update_age, change_age (and previous_* counterparts)
  updated_by, changed_by
  crontab, on_change, on_update
  hysteresis_input, hysteresis_upper_threshold, hysteresis_lower_threshold
  logics[]                {name, description}[]  (which logics reference this item)
  filename

ConfigParameter     (used in system config tables and plugin parameter tables)
  name                  str
  value                  any
  default                any
  type                   str
  gui_type               str
  valid_list[]            str[]
  description             str | dict   (dict = {de:..., en:..., fr:...})

AppConfig           (internal, not from API — see app-config.service.ts)
  apiUrl, dataUrl, hostIp, wsHost, wsPort
  clientIp, tz, tzname, tznameST, tznameDST
  coreBranch, pluginsBranch
  itemtreeFullpath, itemtreeSearchstart
  developerMode, clickDropdownHeader, helpLocalAvailable
  darkModeDefault, resourceGraphPeriod, restartStopsOnly
  fallbackLanguageOrder[], defaultLanguage
  loginRequired
```

---

## Part 8 — The UI components (feature by feature)

Every route in the sidebar corresponds to one feature folder. Here's what each does, what data it fetches, and how it's structured internally.

```
TOP-LEVEL LAYOUT
────────────────
AppComponent
├── TopNavigationComponent   ← the nav bar at the top (always visible)
├── OfflineBannerComponent   ← the red "offline" banner (conditionally visible)
└── <router-outlet>           ← this slot is replaced by the active feature component
```

### System (/system)

```
SystemComponent
│
├── Data sources:
│   ├── ServerApiService.getSystemStats()   → uptime, version, host info
│   ├── ServerApiService.getPypiInfo()      → Python package requirements
│   └── WebsocketPluginService signals      → chart data (systemload, memory, ...)
│
├── On init:
│   ├── getSystemStats() → displays: host, uptime, sh_uptime, version, python version
│   ├── getPypiInfo()    → displays: required packages, installed versions, status
│   └── requests series data for 6 metrics, each landing in its own signal:
│       systemload | systemmemory | systemswap | memory (core) | threads | workerThreads | disk
│
└── Charts rendered with Chart.js, redrawn via a computed() reading the signals above.

System has a sub-route:
├── /system → SystemComponent (overview)
└── /system/config → SystemConfigComponent (core config editor)
```

```
SystemConfigComponent
│
├── Data: ConfigApiService.getConfig()  → structured config sections
├── Displays: collapsible table of config parameters per section
├── Each parameter cell: DynamicFieldComponent renders input by type
│   (text, int, bool, list, ipv4, ipv6, mac, knx_groupaddress, ...)
├── etc/-migration check/enable flow (checkConfigEtc/enableConfigEtc)
└── On save: ConfigApiService.saveConfig(data) → PUT /api/config/core/
```

### Items (/items)

```
ItemTreeComponent   ← the largest component in the app
│
├── Data sources:
│   ├── ItemsApiService.getItemTree()            → full item hierarchy
│   ├── ItemsApiService.getItemDetails(path)     → details for selected item
│   └── WebsocketPluginService.getMonitoredItems() → live value updates
│       (via a PRIVATE per-component WebsocketPluginService instance —
│        see Part 6's note under WebsocketPluginService)
│
├── Left panel: PrimeNG p-tree component
│   ├── Hierarchical display of all items
│   ├── filterNodes(query): filters tree by item path or name
│   │   Uses configurable searchstart (e.g., filter only within 'home.' prefix)
│   └── expandAll() / collapseAll()
│
├── Right panel: item details (shown when item selected)
│   ├── Current value, type, update age, change age
│   ├── Updated by / changed by (which logic/plugin last wrote to this item)
│   ├── Eval expression, triggers, hysteresis config
│   └── Value editor: updateValue(path, value, type)
│         validates range for numeric/scene types
│         calls ItemsApiService.changeItemValue(path, value)
│
├── Create / Edit / Rename-or-move / Delete dialogs
│   ├── Create: auto-creates missing ancestor items ("mkdir -p" style)
│   ├── Edit: reads from editable_config (never config — see Part 7)
│   ├── Rename/move: single path field; offers to auto-create missing
│   │   ancestors if the target parent doesn't exist yet
│   └── Delete: offers to clean up references to the item elsewhere in
│       config, warns separately if the item has sub-items
│
├── Monitored-items tab
│   ├── monitorItem(path, true): subscribe to live updates
│   ├── The list itself lives on SharedService.monitoredItemsList (a
│   │   signal), not on this component — see Part 6. It survives both
│   │   navigating away and a full page reload.
│   └── monitorItem(path, false): unsubscribe
│
└── Attribute browser dialog: lets you pick from the full catalog of
    known item/plugin attributes (core + every loaded plugin's own)
    when adding a free-text attribute to a new or edited item.
```

Also in `src/app/items/`: `ItemConfigurationComponent` (raw item-definition YAML file editor), `StructsComponent` (browse/group defined structs), `StructConfigurationComponent` (struct file editor).

### Logics (/logics)

```
LogicsListComponent
│
├── Data: LogicsApiService.getLogics()
│   Returns: {groups: LogicsGroupType[], logics: LogicsinfoType[], ...}
│
├── Displays: user logics (grouped) and system logics
│
├── Per-logic actions (buttons per row):
│   trigger / enable / disable / load / unload / reload / delete
│   all call: LogicsApiService.setLogicState(name, action)
│
└── Grouped/ungrouped view toggle persisted client-side
    (localStorage key 'shng.logics.grouped')

LogicsGroupsComponent  (/logics/groups)
│
└── Create / edit / merge logic groups:
    saveLogicGroup() / deleteLogicGroup()

LogicsEditComponent  (/logics/edit/:logicname)
│
├── Data: LogicsApiService.getLogic(name), getLogicState(name)
├── CodeEditorComponent (CodeMirror 6) for the logic's Python source
├── FilesApiService for reading/writing the .py and .yaml files
├── Parameter table (DynamicFieldComponent per parameter)
└── saveLogicParameters() → PUT /api/logics/{name}?action=saveparameters
```

### Plugins (/plugins)

```
PluginsComponent
│
├── Data: PluginsApiService.getPluginsInfo()  → PlugininfoType[]
│
├── Displays: one row/card per plugin instance
│   ├── configname, pluginname, version, state indicator
│   ├── Actions: load / unload / reload  (setPluginState)
│   └── Link to the plugin's own web interface, if it has one (webif_url)
│
└── developerMode flag from AppConfigService
    (shows/hides extra controls when developer_mode=true in smarthome config)

PluginConfigComponent  (/plugins/config)
│
├── Data:
│   ├── PluginsApiService.getPluginsConfig()  → current plugin.yaml sections
│   └── PluginsApiService.getPluginsInfo()    → metadata/parameter definitions
│
├── Form-based config editor (DynamicFieldComponent per parameter, PrimeNG p-table rows)
├── setPluginConfig() → PUT /api/plugin/{section}/
├── addPluginConfig() → POST /api/plugin/{section}/
└── deletePluginConfig() → DELETE /api/plugin/{section}/
```

### Scenes (/scenes)

```
ScenesComponent
│
├── Data: ScenesApiService.getScenes() → SceneInfo[]
├── Displays: scene groups, each with:
│   ├── Scene path
│   ├── Value list (possible scene states)
│   └── Action list per value
└── reloadScene(name) / reloadScenes()

SceneConfigurationComponent  (/scenes/config)
│
└── Scene definition file editor (FilesApiService + CodeEditorComponent)
```

### Schedulers (/schedulers)

```
SchedulersComponent
│
├── Data: SchedulersApiService.getSchedulers() → SchedulerInfo[]
└── Displays: scheduled task info in tabs, split by group
    (item / logic / plugin / other / trigger)

ThreadsComponent  (/schedulers/threads)
│
├── Data: ThreadsApiService.getThreads() → ThreadInfo[]
└── Displays: the Python thread list with a live count
```

### Logs (/logs)

```
LogDisplayComponent  (/logs, /logs/display, /logs/display/:logname)
│
├── Data: LogsApiService.getLogs() → available log files
├── For each log file: readLogfile(filename, chunk) → paginated log lines
└── Full-screen mode with its own filter bar and an info dialog
    (both use CodeMirror's fullscreen state — see CodeEditorComponent)

LoggerListComponent  (/logs/logger-list)
│
├── Data: LoggersApiService.getLoggers()
│   Returns: {loggers: {}, active_plugins: [], active_logics: [], defined_handlers: []}
│
├── Four logger categories:
│   ├── Plugin loggers   (one per active plugin)
│   ├── Logic loggers    (one per active logic)
│   ├── Item loggers     (for item-level logging)
│   └── Advanced loggers (arbitrary named loggers)
│
├── Per logger:
│   ├── Log level selector  → setLoggerLevel(logger, level)
│   ├── Handler assignment  → setHandlers(logger, handlerList)
│   └── Delete button       → deleteLogger(logger)
│
└── Create logger → LoggersApiService.addLogger(name)

LoggingConfigurationComponent  (/logs/logging-configuration)
│
└── logging.yaml file editor (FilesApiService.saveLoggingConfig)
```

### Services (/services)

```
ServicesComponent
│
├── Eval checker:
│   ├── Input: expression string
│   └── ServicesApiService.CheckEvalData(expr)
│       → PUT /api/services/evalcheck/
│       ← {expression, type, result}
│
├── YAML checker:
│   ├── Input: YAML text
│   └── ServicesApiService.CheckYamlText(text)
│       → PUT /api/services/yamlcheck/
│
├── YAML converter:
│   ├── Input: old-style config text
│   └── ServicesApiService.ConvertToYamlText(text)
│       → PUT /api/services/yamlconvert/
│
├── SHNG status display with live polling, restart button, password hash
│   generator, config backup download/restore
│
└── Cache checker:
    ├── ServicesApiService.getCacheOrphans()
    │   → GET /api/services/cachecheck/ ← orphaned cache files
    └── deleteCacheFile(filename)
        → PUT /api/services/cachefile_delete?filename=...

FunctionConfigurationComponent  (/services/functions)
│
└── User-function file editor, per-function and reload-all buttons
    (FunctionsApiService.reloadFunction/reloadFunctions)
```

---

## Part 9 — How data flows through one complete interaction

Let's trace exactly what happens when you navigate to `/logics` and click "Trigger" on a logic.

```
USER ACTION: navigate to /logics
────────────────────────────────────────────────────────────────────

1. Angular Router sees URL change to /logics
   └─ appReadyGuard runs:
      └─ AppConfigService.snapshot.loginRequired !== null? → yes (it
         was already resolved before routing even started) → proceed

2. Router activates LogicsListComponent
   └─ Angular creates new instance, injects: LogicsApiService, Router

3. ngOnInit() runs  (Angular calls this once on component creation)
   └─ this.getLogics()

4. getLogics():
   └─ this.logicsApi.getLogics()
      └─ HTTP GET http://host:8383/api/logics/
         │
         ← Response JSON:
            {
              groups: [{name: 'group1', title: 'My Group', description: '...'}],
              logics: [
                {name: 'my_logic', group: 'group1', enabled: true, loaded: true, ...},
                ...
              ]
            }

5. .subscribe(data => { ... })
   └─ writes into signals: this.userLogics.set(...), this.groupList.set(...)
   └─ writing a signal is what tells Angular to re-render — see Part 17

6. Template renders:
   @for (group of groupList(); track group.name) {      ← loop over groups
     @for (logic of group.logics; track logic.name) {   ← loop over logics
       <button (click)="triggerLogic(logic.name)">Trigger</button>
     }
   }


USER ACTION: click "Trigger" on 'my_logic'
────────────────────────────────────────────────────────────────────

1. (click)="triggerLogic('my_logic')" fires — this is a template
   event binding, so Angular schedules a check on this component
   regardless of zoneless (Part 17); no special handling needed here.

2. triggerLogic(name):
   └─ this.logicsApi.setLogicState('my_logic', 'trigger')
      └─ HTTP PUT http://host:8383/api/logics/my_logic?action=trigger
         │
         ← Response: {result: 'ok', description: 'triggered'}

3. .subscribe(result => {
     if (result.result === 'ok') {
       this.getLogics()   ← refresh the list (writes fresh data into
                              the same signals from step 5 above)
     }
   })
```

---

## Part 10 — Signals and Observables (the reactive patterns you will see everywhere)

Python has `async/await` and generators. Angular has two complementary reactive tools, and this codebase uses both, for different jobs.

### Signals — the default for component state

A signal is the simplest possible reactive primitive: a box holding a current value, where reading it inside a template (or inside a `computed()`) automatically tells Angular "re-check this view if the box's contents ever change."

```typescript
// Angular signal
readonly count = signal(0);

increment() {
  this.count.update(n => n + 1);   // or: this.count.set(this.count() + 1)
}
```
```html
<!-- template -->
<p>Count: {{ count() }}</p>          <!-- reading it registers the dependency -->
```

There's no Python built-in that matches this exactly, but the closest intuition is a plain variable where every read is silently tracked — closer to a spreadsheet cell with dependents than to anything in typical Python code.

### Observables — for genuinely asynchronous streams

```
PYTHON async/await analogy:

# Python
async def get_logics():
    response = await http_client.get('/api/logics/')
    return response.json()

data = await get_logics()
process(data)

# Angular/RxJS equivalent
getLogics(): Observable<LogicsResponse> {
  return this.http.get<LogicsResponse>('/api/logics/')
}

this.getLogics().subscribe(data => {
  process(data)
})
```

The key difference: an Observable is **lazy** — nothing happens until you call `.subscribe()`. It's more like a generator than a coroutine.

### How they connect: `toSignal()`

The most common pattern in this codebase is to bridge an Observable to a signal right at the component boundary, so the rest of the component only has to deal with signals:

```typescript
readonly logics = toSignal(
  this.logicsApi.getLogics().pipe(map(r => r.logics ?? [])),
  { initialValue: [] },
);
```

`toSignal()` subscribes automatically when first read, and unsubscribes automatically when the component is destroyed — equivalent to Python's `async with resource: ...`, but you never write the `with` yourself.

```
RXJS OPERATORS (used in this app)

.pipe(
  catchError(() => of({}))   ← if error, emit empty object (like try/except)
)

.pipe(
  takeUntilDestroyed(this.destroyRef)  ← cancel when component is destroyed
)                                         like cancelling an asyncio task
                                          (still needed for imperative
                                           .subscribe() calls that aren't
                                           routed through toSignal())

firstValueFrom(observable$)  ← await the first value and return it
                                most similar to Python's await

BehaviorSubject<T>(initialValue)
  ← holds a current value AND emits it to new subscribers immediately
  ← like threading.Event but with a value
  ← .next(newValue) to push a new value
  ← .getValue() to read current value synchronously
  ← still used by a handful of infrastructure services (AuthService,
    ThemeService, ConnectivityService, WebsocketService) where modelling
    an event stream is genuinely the right shape — not everything in
    this app has been converted to signals, only component-level state

Subject<T>
  ← like BehaviorSubject but no initial value; late subscribers miss previous events
```

The `$` suffix on variable names is a convention meaning "this is an Observable" — `serverReady$`, `online$`, `loggedIn$`. Signals don't get a suffix; they're called like functions instead (`items()`), which is visually distinct enough on its own.

---

## Part 11 — Authentication flow

```
FIRST VISIT (not logged in)
───────────────────────────────────────────────────────────────

Browser → /                  ← root URL
Router  → redirect to /system
appReadyGuard → loginRequired already known from boot → ok
authGuard → isLoggedIn()? → NO
  └─ router.createUrlTree(['/login'], {queryParams: {returnUrl: '/system'}})

LoginComponent renders login form

User types credentials, clicks Login:
  └─ AuthService.login({username: 'admin', password: 'xxx'})
     ├─ hashes: sha512('admin' + 'shNG0160$')                  ← username
     ├─ hashes: sha512(sha512('xxx') + 'shNG0160$')              ← password, DOUBLE hash
     └─ POST /api/authenticate/user
        body: {username: '<hash>', password: '<hash>'}
        ← JWT token: 'eyJhbGc...'

     AuthService stores token:
       sessionStorage['token'] = 'eyJhbGc...'
       this.loggedIn$.next(true)

     Decodes JWT payload (no verification, client-side only):
       this.currentUser = {username: 'admin', exp: 1234567890, ...}

     Router.navigate([returnUrl])  ← back to /system


SUBSEQUENT API CALLS
──────────────────────────────────────────────────────────────

@auth0/angular-jwt (registered via DI in main.ts, NOT a hand-written
interceptor file) intercepts every same-origin HTTP request:
  ├─ reads token from AuthService.getToken()
  └─ adds header: Authorization: Bearer eyJhbGc...

SmartHomeNG REST API validates the JWT on every request.


TOKEN RENEWAL
──────────────────────────────────────────────────────────────

AuthService.renewToken() fires automatically, from inside isLoggedIn(),
once the token is past the halfway point of its own lifetime
(renewAfter = iat + ttl/2).
  └─ PUT /api/authenticate/renew
     ← new JWT token
     → overwrites sessionStorage['token']

  If the server ever echoes back the SAME token, that's treated as
  "this server doesn't support renewal" and further attempts stop.
```

---

## Part 12 — Real-time data (WebSocket)

The charts and item monitoring don't poll the REST API. They use a persistent WebSocket connection. Host and port are never hardcoded — they arrive from `/api/server/` during boot (Part 4).

```
WebSocket lifecycle:
─────────────────────────────────────────────────────────────────

TopNavigationComponent.ngOnInit()
  └─ websocketPlugin.connect()          ← uses the ROOT-provided instance
     └─ WebsocketService.connect(`ws://${wsHost}:${wsPort}/...`)
        └─ new WebSocket(url)
           └─ on open: send identity message
              {cmd: 'identity', sw: 'shngAdmin', ver: '...', browser: 'Chrome...'}

SystemComponent requests chart data:
  └─ websocketPlugin.getSeriesLoad('24h', 100)
     └─ sends: {cmd: 'series', item: 'env.system.load', ...}

SmartHomeNG sends back:
  ← {cmd: 'series', sid: '...', series: [{t:..., v:...}, ...]}

WebsocketPluginService receives message:
  └─ handleResponseSeries() → this.systemload.update(() => newSeriesData)
     (a signal write — see Part 17 for why this alone is enough to
      trigger a re-render, no manual "please redraw" call needed)

SystemComponent reads the signal directly in its template/computed():
  └─ chartdataLoad = computed(() => convertToChartFormat(this.websocketPlugin.systemload()))


Item monitoring (ItemTreeComponent):
─────────────────────────────────────────────────────────────────

ItemTreeComponent has its OWN private WebsocketPluginService instance
(declared in its own @Component({ providers: [...] })) — separate from
the one TopNavigationComponent uses. It gets destroyed and recreated
every time you navigate to/from the item tree.

User clicks "Monitor" for item 'env.core.threads':
  └─ websocketPlugin.getMonitoredItems(['env.core.threads'], callback)
     └─ sends: {cmd: 'monitor', items: ['env.core.threads']}

SmartHomeNG pushes updates whenever the item changes:
  ← {cmd: 'item', items: [['env.core.threads', {value: 44, ...}]]}

WebsocketPluginService receives, calls the registered callback:
  └─ callback(data)
     └─ writes into SharedService.monitoredItemsList (a signal, and a
        ROOT singleton — see Part 6) → the monitored-items table
        re-renders wherever it's shown, survives this component being
        destroyed on navigation, and (via a localStorage mirror of the
        watched paths) survives a full page reload too.

WebSocket reconnect:
  If disconnected: WebsocketService retries with backoff (same intervals as HTTP)
  On reconnect: re-sends all pending messages from messageQueue, and
  ItemTreeComponent's ngOnInit re-registers monitoring for every
  currently-watched path (including ones just restored from localStorage).
```

---

## Part 13 — The UI component library (PrimeNG)

The app uses **PrimeNG 21**, a large library of pre-built Angular UI components. You'll see its names throughout the templates. Quick reference to what's actually used in this codebase (PrimeNG has renamed several components over the years — these are the current names, not the ones you'll find in older tutorials):

```
PrimeNG COMPONENT              WHAT IT RENDERS
───────────────────────────    ──────────────────────────────────
p-tree                          Hierarchical tree (the item tree)
p-dialog                        Modal dialog
p-select                        Select/dropdown (was p-dropdown pre-v18)
p-toggleswitch                  Toggle switch (was p-inputSwitch pre-v18)
p-tabs / p-tablist / p-tab /
  p-tabpanels / p-tabpanel       Tab container (was p-tabView/p-tabPanel pre-v20)
p-accordion / p-accordion-panel /
  p-accordion-header /
  p-accordion-content            Collapsible sections (split-component API, v20+)
p-autoComplete                  Autocomplete text input
p-pickList                      Dual-list picker
p-listbox                       Selectable list
p-fileUpload                    File upload control
p-checkbox                      Checkbox
p-toast / p-messages / p-message Notification/inline-message display
p-progressSpinner                Loading spinner
p-chart                          Chart.js wrapper
p-sortIcon                       Column sort indicator (used with plain <table>, see below)
```

**Important:** most *list tables* in this app (logics, plugins, schedulers, threads, scenes, structs, loggers, ...) are **plain HTML `<table>` elements with Bootstrap classes** (`table table-striped table-hover shng-list-table`), not PrimeNG's `p-table`. `p-table` itself only shows up in a few places — the parameter-editing grids in the plugin config editor, system config editor, and logic parameter editor, where `DynamicFieldComponent` renders each row's value input. If you're looking for "the table component," check which kind of table you're actually looking at first.

You don't need to dig into PrimeNG source. If you see `<p-something>` in a template, it's a PrimeNG widget; if you see `<table class="table ...">`, it's a plain Bootstrap-styled table.

---

## Part 14 — Internationalization (i18n)

The app supports English, German, and French fully, plus partial Danish/Finnish/Norwegian/Dutch/Swedish translations.

```
Translation files:    src/assets/i18n/en.json, de.json, fr.json, da.json, fi.json, nb.json, nl.json, sv.json

In templates:
  {{ 'LOGICS.TRIGGER' | translate }}
     │                   │
     │                   └── Angular pipe: transforms the value
     └── translation key

In TypeScript:
  this.translate.instant('SYSTEM.RESTART_CONFIRM')

Language selection:
  UserPreferencesService (localStorage 'shngadmin_prefs')  ← saved user choice
  SharedService.setGuiLanguage()   ← calls TranslateService.use('de')
  Fallback order from server config: e.g., ['de', 'en', 'fr']
    → SharedService.getDescription({de: '...', en: '...'})
      picks language[0], falls back to language[1] if missing
```

---

## Part 15 — Complete dependency map

```
                        AppConfigService
                        ┌───────────────────────────────────────────┐
                        │  Single global config store                │
                        │  All services and components read from it │
                        └───────────┬───────────────────────────────┘
                                    │ populated by
                                    ▼
                 ServerApiService.getServerBasicinfo()  (APP_INITIALIZER, before routing)
                 ServerApiService.getServerinfo()       (TopNavigationComponent.ngOnInit)


INFRASTRUCTURE SERVICES (no feature, pure plumbing)

  AuthService ────────────────────────────────────► sessionStorage
       │
       ▼ token
  @auth0/angular-jwt (DI-registered, not a hand-written interceptor)
       │
       ▼ adds Authorization header to every same-origin request
  HttpClient


  ConnectivityService ◄────── connectivityInterceptor (watches /api/ responses)
       │
       ▼ online$
  OfflineBannerComponent


  ThemeService ◄────── window.matchMedia('(prefers-color-scheme: dark)')
       │
       ▼ darkMode$
  <html class="dark-mode">  ← app CSS variables + PrimeNG darkModeSelector


  WebsocketService (raw, root-provided)
       │ wrapped by
  WebsocketPluginService (root instance) ──► systemload, memory, threads, ... (signals)
       │                                          │
       ▼                                          ▼
  SmartHomeNG WebSocket                    SystemComponent

  ItemTreeComponent gets its OWN private WebsocketPluginService instance
  (component-scoped providers) — monitored-item DATA flows through it, but
  the monitored-item LIST lives on SharedService (root) so it survives
  navigation and reload.


FEATURE COMPONENTS AND THEIR SERVICE DEPENDENCIES

  SystemComponent
    ├── ServerApiService        (system info, pypi info)
    ├── WebsocketPluginService  (chart series data)
    └── SharedService           (date/time formatting)

  SystemConfigComponent
    └── ConfigApiService        (get/save config, etc/-migration check)

  ItemTreeComponent
    ├── ItemsApiService         (item tree, item details, CRUD, value change)
    ├── WebsocketPluginService  (private instance — monitored item values)
    ├── SharedService           (monitoredItemsList signal, validators, formatters)
    └── AppConfigService        (searchstart config)

  LogicsListComponent
    ├── LogicsApiService        (list, state, groups)
    └── Router                  (navigate to edit)

  LogicsGroupsComponent
    └── LogicsApiService        (group CRUD)

  LogicsEditComponent
    ├── LogicsApiService        (get, save parameters)
    └── FilesApiService         (read/write .py and .yaml files)

  PluginsComponent
    ├── PluginsApiService       (info, state)
    └── AppConfigService        (developerMode)

  PluginConfigComponent
    └── PluginsApiService       (config CRUD)

  ScenesComponent
    └── ScenesApiService

  SceneConfigurationComponent
    └── FilesApiService

  SchedulersComponent
    └── SchedulersApiService

  ThreadsComponent
    └── ThreadsApiService

  LogDisplayComponent
    └── LogsApiService

  LoggerListComponent
    └── LoggersApiService

  LoggingConfigurationComponent
    └── FilesApiService

  ServicesComponent
    └── ServicesApiService      (eval, yaml, cache), ServerApiService (status/restart/backup)

  FunctionConfigurationComponent
    └── FunctionsApiService, FilesApiService

  LoginComponent
    └── AuthService
```

---

## Part 16 — One-line summary of every file

```
INFRASTRUCTURE
  main.ts                      app entry point: zoneless CD, global providers, APP_INITIALIZERs
  app.component.ts             root shell: renders nav + offline banner + router slot
  app.routes.ts                URL→route-group map, all 8 feature roots guarded

  app-config.service.ts        global config dict (wsPort, apiUrl, tz, etc.)
  auth.service.ts               login/logout/token renewal
  auth.guard.ts                 redirects to /login if not authenticated
  connectivity.service.ts       heartbeat, offline detection, retry backoff
  connectivity.interceptor.ts   HTTP middleware: cancels offline debounce on API success
  websocket.service.ts          raw WebSocket with reconnect and message queue
  websocket-plugin.service.ts   SmartHomeNG protocol: item monitoring + chart series (signals)
  theme.service.ts              light/dark/system theme preference
  log.service.ts                console.log wrapper (suppressed in production)
  shared.service.ts             formatting/validation utilities + monitored-items-list signal
  user-preferences.service.ts   localStorage wrapper for language + theme preference
  app-ready.guard.ts            blocks routes until the initial server response arrives

API SERVICES
  server-api.service.ts         /api/server/, /api/system/ — server info, restart, stats
  items-api.service.ts          /api/items/ — tree, list, details, CRUD, references
  logics-api.service.ts         /api/logics/ — logic CRUD and state control
  plugins-api.service.ts        /api/plugins/ and /api/plugin/ — plugin CRUD and state
  scenes-api.service.ts         /api/scenes/ — scene list and reload
  schedulers-api.service.ts     /api/schedulers/ — scheduler info
  threads-api.service.ts        /api/threads/ — thread info
  logs-api.service.ts           /api/logs/ — log file list and chunked reading
  loggers-api.service.ts        /api/loggers/ — logger CRUD, levels, handlers
  services-api.service.ts       /api/services/ — eval/yaml tools, cache management
  config-api.service.ts         /api/config/ — smarthomeng core config
  files-api.service.ts          /api/files/ — generic file read/write/delete
  functions-api.service.ts      /api/functions/ — function reload
  structs-api.service.ts        /api/items/structs/ — struct definitions

MODELS (data shapes)
  server-info.ts                ServerInfo
  item-tree.ts                  ItemTree, ItemTreeNode (recursive)
  item-details.ts                ItemDetails (value, age, triggers, eval, config/editable_config)
  item-attribute-info.ts         ItemAttributeInfo (catalog entry shape)
  item-reference.ts              ItemReference (used by delete-item's reference check)
  item-remove-references-result.ts, item-rename-result.ts
  plugin-info.ts                 PlugininfoType, PluginParameter, PluginMetadata, PluginItemAttribute
  plugins-config.ts, plugins-installed.ts
  logics-info.ts                 LogicsinfoType, LogicsGroupType
  logics-watch-item.ts           LogicsWatchItem
  scene-info.ts                  SceneInfo, SceneValue
  scheduler-info.ts              SchedulerInfo
  thread-info.ts                 ThreadInfo
  loggers-info.ts                LoggersType (loggers, handlers, active_*)
  logfiles-info.ts               LogsType
  pypi-info.ts                   PypiInfo (package requirement status)
  interfaces.ts                  TreeNode, TableColumn, ConfigParameter

FEATURE COMPONENTS
  system/system-overview/       dashboard: uptime, pypi status, real-time charts
  system/system-config/         core config editor table
  items/item-tree/              hierarchical item browser, monitoring, create/edit/rename/delete
  items/item-configuration/     raw item-definition YAML file editor
  items/structs/                struct browser
  items/struct-configuration/   struct YAML file editor
  items/attribute-value-input/  type-aware item-attribute input (shared with plugin config)
  logics/logics-list/           logic list with group toggle and state control
  logics/logics-groups/         group create/edit/merge dialog
  logics/logics-edit/           CodeMirror editor for logic code + parameter editor
  plugins/plugin-list/          plugin instance list with load/unload/reload
  plugins/config/                plugin.yaml config editor
  scenes/scene-list/            scene group and value display
  scenes/scene-configuration/   scene definition file editor
  schedulers/schedulers/        scheduler info display
  schedulers/threads/            thread list
  logs/log-display/              log file display with chunked loading, fullscreen mode
  logs/logger-list/              logger creation, level and handler assignment
  logs/logger-line/              single logger row (subcomponent of logger-list)
  logs/logger-tab/               tab-content wrapper for logger-list
  logs/logging-configuration/   logging.yaml editor
  services/services.component.ts main services page (at the feature root, no subfolder)
  services/function-configuration/ user-function file editor
  login/                         username/password form → AuthService.login()

SHARED COMPONENTS
  offline-banner/                red "offline" bar, retry countdown + button
  code-editor/                   CodeMirror 6 wrapper (Python/YAML/JS/XML, fullscreen mode)
  dynamic-field/                 renders a ConfigParameter as the right input type
  attribute-value-input/         renders an item attribute as the right input type
  top-navigation/                nav bar: links to all sections, theme toggle, language selector, logout
```

---

## Part 17 — Why "zoneless" and "signals" matter more here than in a typical Angular tutorial

Most Angular material you'll find online assumes the app loads `zone.js` — a library that monkey-patches every async browser API (`setTimeout`, `Promise`, `fetch`, WebSocket, DOM events) so the framework can be told "something might have changed, go check everything." This app doesn't do that (`provideZonelessChangeDetection()` in `main.ts`, no `zone.js` in the dependency list at all).

Every component also uses `ChangeDetectionStrategy.OnPush`, which — combined with zoneless — means a component only re-renders when:

1. A **signal** it reads changes.
2. A **template event** on that component fires (click, input change, ...).
3. An Observable used via the `async` pipe emits.
4. Something explicitly calls `ChangeDetectorRef.markForCheck()`.

If you're used to a Python web framework, the closest analogy is: imagine if Flask/Django only re-rendered a template fragment when a value it actually read from was reassigned through a tracked `@property` setter — reassigning a plain instance attribute the old-fashioned way would silently do nothing to the rendered output. That's genuinely how it works here. There's no ambient "everything gets checked periodically" background mechanism to bail you out.

**In practice this means:** when writing new component code, prefer `signal()`/`computed()`/`toSignal()` for anything a template reads. `this.foo = bar` inside an HTTP or WebSocket callback will compile fine and hold the right value in memory — it just won't show up on screen. `this.foo.set(bar)` will.

There is exactly one manual `ChangeDetectorRef.detectChanges()` call left in the entire app (in `TopNavigationComponent`, keeping the theme-toggle icon in sync — the comment right above it explains exactly why `markForCheck()` alone wasn't reliable enough in that one specific spot). Everywhere else, signals do the whole job.

Testing follows the same rule: Jest runs zoneless too (`jest-preset-angular`'s `setupZonelessTestEnv()`), and Angular's `fakeAsync()`/`tick()` helpers — which need `zone.js` internally — don't work here. Anything that needs to control time in a test uses Jest's own `jest.useFakeTimers()` / `jest.advanceTimersByTimeAsync()` instead.

---

*Source: `src/` directory of shngAdmin, branch `work`.*

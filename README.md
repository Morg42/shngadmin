# shngadmin

Admin interface for SmartHomeNG — Angular app included in the admin module of SmartHomeNG.

---

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 20.x, currently running on Angular 21 (zoneless — see `architecture.md`).

### Node.js requirement

Node.js 22 or later is required. Check the active version with `node --version`.
If needed, switch versions with `nvm use 22`.

## Development server

Run `npm start` (or `ng serve` directly) for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

By default it proxies API/WebSocket calls to whatever SmartHomeNG instance is configured in `proxy.conf.js` — edit the `PROXY_TARGET` constant near the top of that file to point at your own server.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum`.

## Build

Run `ng build` to build the project. The build artifacts are stored in `dist/static/browser/`.

For a production build, prefer `npm run build:prod` over a raw `ng build` — it additionally stamps the build with a version string derived from `package.json` plus the current git commit/branch, and copies the generated `3rdpartylicenses.txt` into `src/assets/` so it's available at runtime:

```
npm run build:prod
```

This builds with the default base href (`/`) — it does **not** pass `--base-href`. If deploying under a subpath (e.g. `/admin/`), run the equivalent manually instead: `node scripts/generate-version.js && ng build --configuration production --base-href /admin/`.

Afterwards copy the contents of `dist/static/browser/` to the admin module of SmartHomeNG at `modules/admin/webif/static`. Clear all existing files and folders there before copying.

Then commit and push the changes to the smarthome repository.

## Running unit tests

`ng test` is **not** wired up in this project. Run `npm test` to execute the unit tests via [Jest](https://jestjs.io/) directly (`npm run test:watch` for a watch mode, `npm run test:coverage` for a coverage report).

## Further help

To get more help on the Angular CLI use `ng help` or check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

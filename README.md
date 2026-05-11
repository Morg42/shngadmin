# shngadmin

Admin interface for SmartHomeNG — Angular app included in the admin module of SmartHomeNG.

---

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 20.x.

### Node.js requirement

Node.js 22 or later is required. Check the active version with `node --version`.
If needed, switch versions with `nvm use 22`.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

For a production build targeting the admin module:

```
ng build --configuration production --base-href /admin/
```

Afterwards copy the content of `dist/` (the directory **static**) to the admin module of SmartHomeNG at `modules/admin/webif/static`. Clear all existing files and folders there before copying.

Then commit and push the changes to the smarthome repository.

## Running unit tests

Run `ng test` to execute the unit tests via [Jest](https://jestjs.io/).

## Further help

To get more help on the Angular CLI use `ng help` or check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

import 'codemirror/mode/python/python';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/yaml/yaml';

import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/display/autorefresh';
import 'codemirror/addon/display/fullscreen';
import 'codemirror/addon/display/rulers';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/comment-fold';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/fold/xml-fold';
import 'codemirror/addon/hint/anyword-hint';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/scroll/annotatescrollbar';
import 'codemirror/addon/search/jump-to-line';
import 'codemirror/addon/search/matchesonscrollbar';
import 'codemirror/addon/search/search';
import 'codemirror/addon/search/searchcursor';

import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';

import { enableProdMode, importProvidersFrom, Injector } from '@angular/core';

import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withRouterConfig } from '@angular/router';
import { JWT_OPTIONS, JwtModule } from '@auth0/angular-jwt';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { AppComponent, HttpLoaderFactory } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { getBaseUrl, jwtOptionsFactory } from './app/bootstrap.utils';
import { OlddataService } from './app/common/services/olddata.service';
import { WebsocketPluginService } from './app/common/services/websocket-plugin.service';
import { environment } from './environments/environment';

const ShngPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f0f5fa',
      100: '#dce8f3',
      200: '#bad4e8',
      300: '#93bfdc',
      400: '#7daecf',
      500: '#709cc2',
      600: '#538cb0',
      700: '#3e6e8c',
      800: '#2e5168',
      900: '#213c4d',
      950: '#162836',
    },
  },
});

if (environment.production) {
  enableProdMode();
  console.log = () => {};
  console.debug = () => {};
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
    importProvidersFrom(
      JwtModule.forRoot({
        config: { throwNoTokenError: false },
        jwtOptionsProvider: {
          provide: JWT_OPTIONS,
          useFactory: jwtOptionsFactory,
          deps: [Injector],
        },
      }),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),
    ),
    { provide: 'BASE_URL', useFactory: getBaseUrl },
    OlddataService,
    WebsocketPluginService,
    TranslateService,
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    providePrimeNG({ theme: { preset: ShngPreset, options: { darkModeSelector: false } } }),
  ],
}).catch((err) => console.log(err));

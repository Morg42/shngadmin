import {
  APP_INITIALIZER,
  enableProdMode,
  importProvidersFrom,
  Injector,
  provideZonelessChangeDetection,
} from '@angular/core';

import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  PreloadAllModules,
  provideRouter,
  withPreloading,
  withRouterConfig,
} from '@angular/router';
import { JWT_OPTIONS, JwtModule } from '@auth0/angular-jwt';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { firstValueFrom } from 'rxjs';
import { AppComponent, HttpLoaderFactory } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { getBaseUrl, jwtOptionsFactory } from './app/bootstrap.utils';
import { connectivityInterceptor } from './app/common/interceptors/connectivity.interceptor';
import { ServerApiService } from './app/common/services/server-api.service';
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
  components: {
    tabs: {
      activeBar: {
        height: '2px',
      },
    },
  },
});

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      appRoutes,
      withPreloading(PreloadAllModules), // preload all lazy chunks after initial navigation
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
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
    {
      // Fetch basic server config (including wsPort) before the router starts
      // its initial navigation.  Without this, appReadyGuard subscribes to
      // serverReady$ before getServerBasicinfo() is even called, which causes
      // every first-load navigation to hang until the 5-second timeout fires.
      provide: APP_INITIALIZER,
      useFactory: (serverApi: ServerApiService) => () =>
        firstValueFrom(serverApi.getServerBasicinfo()),
      deps: [ServerApiService],
      multi: true,
    },
    {
      // Detect stale frontend: compare the server's index.html fingerprint
      // (ETag / Last-Modified) with the value cached from the previous load.
      // If they differ a new deployment has occurred and the page is reloaded
      // automatically — no user action required.  Runs in parallel with
      // getServerBasicinfo() during bootstrap so it adds zero extra latency.
      provide: APP_INITIALIZER,
      useFactory: (serverApi: ServerApiService) => () => serverApi.checkForUpdate(),
      deps: [ServerApiService],
      multi: true,
    },
    MessageService,
    WebsocketPluginService,
    TranslateService,
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi(), withInterceptors([connectivityInterceptor])),
    // '.dark-mode' (rather than the default 'system'/media-query-driven
    // selector) since dark mode here is an explicit user/admin choice, not
    // OS-preference-driven — see ThemeService, which toggles this class on
    // <html>.
    providePrimeNG({ theme: { preset: ShngPreset, options: { darkModeSelector: '.dark-mode' } } }),
  ],
}).catch((err) => console.log(err));

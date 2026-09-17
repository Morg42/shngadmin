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
import { StreamService } from './app/common/services/stream.service';
import { environment } from './environments/environment';

/**
 * Filled/outlined/text button colors for the severities this app actually
 * uses (secondary/success/danger/warn — info/help/contrast are unused and
 * keep Aura's stock colors). Ported from the `.ui-button-*`/`.btn-outline-*`
 * CSS these severities replace (src/styles.css) so the values match what's
 * already on screen today, not a fresh color choice. `success` is this app's
 * established "brand blue" action color (pre-existing naming quirk, not
 * something this migration renames) — not the conventional green.
 *
 * One deliberate deviation: the old `.btn-outline-*`/`.ui-button-*` hover
 * state fully inverts to a solid fill with white text. PrimeNG's `outlined`/
 * `text` token schema has no separate hover-text-color slot (only
 * hoverBackground/activeBackground), so replicating that exactly would mean
 * fighting the component with more `!important` CSS — the same pattern this
 * migration exists to get rid of. Using PrimeNG's own light color-mix tint
 * convention (same mechanism Aura's stock severities already use) instead.
 */
const buttonColorScheme = {
  root: {
    secondary: {
      background: 'var(--shng-secondary-button)',
      hoverBackground: '#868e96',
      activeBackground: '#868e96',
      borderColor: 'var(--shng-border)',
      hoverBorderColor: '#868e96',
      activeBorderColor: '#868e96',
      color: 'var(--text-secondary)',
      hoverColor: '#ffffff',
      activeColor: '#ffffff',
      focusRing: { color: 'var(--text-secondary)', shadow: 'none' },
    },
    success: {
      background: 'var(--shng-blue)',
      hoverBackground: '#286090',
      activeBackground: '#286090',
      borderColor: 'var(--shng-blue)',
      hoverBorderColor: '#204d74',
      activeBorderColor: '#204d74',
      color: '#ffffff',
      hoverColor: '#ffffff',
      activeColor: '#ffffff',
      focusRing: { color: 'var(--shng-blue)', shadow: 'none' },
    },
    danger: {
      background: 'var(--shng-red)',
      hoverBackground: '#8f0606',
      activeBackground: '#8f0606',
      borderColor: 'var(--shng-border)',
      hoverBorderColor: '#8f0606',
      activeBorderColor: '#8f0606',
      color: '#ffffff',
      hoverColor: '#ffffff',
      activeColor: '#ffffff',
      focusRing: { color: 'var(--shng-red)', shadow: 'none' },
    },
    warn: {
      background: 'var(--shng-amber)',
      hoverBackground: '#9c6709',
      activeBackground: '#9c6709',
      borderColor: 'var(--shng-amber)',
      hoverBorderColor: '#9c6709',
      activeBorderColor: '#9c6709',
      color: '#ffffff',
      hoverColor: '#ffffff',
      activeColor: '#ffffff',
      focusRing: { color: 'var(--shng-amber)', shadow: 'none' },
    },
  },
  outlined: {
    secondary: {
      hoverBackground: 'color-mix(in srgb, var(--text-secondary), transparent 90%)',
      activeBackground: 'color-mix(in srgb, var(--text-secondary), transparent 80%)',
      borderColor: 'var(--text-secondary)',
      color: 'var(--text-secondary)',
    },
    success: {
      hoverBackground: 'color-mix(in srgb, var(--shng-blue), transparent 90%)',
      activeBackground: 'color-mix(in srgb, var(--shng-blue), transparent 80%)',
      borderColor: 'var(--shng-blue)',
      color: 'var(--shng-blue)',
    },
    danger: {
      hoverBackground: 'color-mix(in srgb, var(--shng-red), transparent 90%)',
      activeBackground: 'color-mix(in srgb, var(--shng-red), transparent 80%)',
      borderColor: 'var(--shng-red)',
      color: 'var(--shng-red)',
    },
    warn: {
      hoverBackground: 'color-mix(in srgb, var(--shng-amber), transparent 90%)',
      activeBackground: 'color-mix(in srgb, var(--shng-amber), transparent 80%)',
      borderColor: 'var(--shng-amber)',
      color: 'var(--shng-amber)',
    },
  },
  text: {
    secondary: {
      hoverBackground: 'color-mix(in srgb, var(--text-secondary), transparent 90%)',
      activeBackground: 'color-mix(in srgb, var(--text-secondary), transparent 80%)',
      color: 'var(--text-secondary)',
    },
    success: {
      hoverBackground: 'color-mix(in srgb, var(--shng-blue), transparent 90%)',
      activeBackground: 'color-mix(in srgb, var(--shng-blue), transparent 80%)',
      color: 'var(--shng-blue)',
    },
    danger: {
      hoverBackground: 'color-mix(in srgb, var(--shng-red), transparent 90%)',
      activeBackground: 'color-mix(in srgb, var(--shng-red), transparent 80%)',
      color: 'var(--shng-red)',
    },
    warn: {
      hoverBackground: 'color-mix(in srgb, var(--shng-amber), transparent 90%)',
      activeBackground: 'color-mix(in srgb, var(--shng-amber), transparent 80%)',
      color: 'var(--shng-amber)',
    },
  },
};

const ShngPreset = definePreset(Aura, {
  semantic: {
    // Global disabled-button opacity for every PrimeNG component (applied via
    // PrimeNG's own base .p-disabled/.p-component:disabled rule) - overridden
    // here instead of a hand-written CSS rule so it's set once, app-wide, the
    // same way the rest of this preset already works. Matches the value this
    // app's own pre-existing .btn:disabled rule (styles.css) already used, so
    // Bootstrap-remnant and PrimeNG-rendered buttons dim by the same amount.
    disabledOpacity: '0.65',
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
    button: {
      colorScheme: {
        light: buttonColorScheme,
        dark: buttonColorScheme,
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
    StreamService,
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

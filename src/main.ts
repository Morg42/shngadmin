
import 'codemirror/mode/python/python';
import 'codemirror/mode/yaml/yaml';
import 'codemirror/mode/xml/xml';

import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/comment-fold';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/xml-fold';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/display/fullscreen';
import 'codemirror/addon/display/rulers';
import 'codemirror/addon/display/autorefresh';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/anyword-hint';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/search/search';
import 'codemirror/addon/scroll/annotatescrollbar';
import 'codemirror/addon/search/matchesonscrollbar';
import 'codemirror/addon/search/jump-to-line';

import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';

import { enableProdMode, Injector, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// import { appConfig } from './app/app.config';

import { getBaseUrl, jwtOptionsFactory, translateHttpLoaderFactory } from './app/app.module';
import { environment } from './environments/environment';
import { OlddataService } from './app/common/services/olddata.service';
import { WebsocketPluginService } from './app/common/services/websocket-plugin.service';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { JwtModule, JWT_OPTIONS } from '@auth0/angular-jwt';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptorsFromDi, HttpClient } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app/app-routing-module';
import { AuthService } from './app/common/services/auth.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { NgOptimizedImage } from '@angular/common';
import { HttpLoaderFactory, AppComponent } from './app/app.component';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

const ShngPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#f0f5fa',
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
    }
  }
});
const authService = injector.get(AuthService);



if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, FormsModule, AppRoutingModule, JwtModule.forRoot({
            config: { throwNoTokenError: false },
            jwtOptionsProvider: {
                provide: JWT_OPTIONS,
                useFactory: jwtOptionsFactory,
                deps: [Injector],
            },
        }), FontAwesomeModule, MenubarModule, ButtonModule, MessageModule, NgOptimizedImage, TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient],
            },
        })),
        { provide: 'BASE_URL', useFactory: getBaseUrl },
        OlddataService,
        WebsocketPluginService,
        TranslateService,
        JwtModule,
        provideAnimationsAsync(),
        provideHttpClient(withInterceptorsFromDi()),
        providePrimeNG({ theme: { preset: ShngPreset, options: { darkModeSelector: false } } }),
    ]
})
  .catch(err => console.log(err));



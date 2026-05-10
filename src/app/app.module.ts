import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { Injector } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { FormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { JwtModule, JWT_OPTIONS } from '@auth0/angular-jwt';

import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

// Remap Aura's primary palette to the shng blue family (#709cc2 at 500).
// This propagates through every PrimeNG component token that references
// {primary.*} — tabs active-bar, buttons, focus rings, etc. — replacing
// the default Aura green without touching individual component CSS.
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

import { AppComponent } from './app.component';
import { HttpLoaderFactory } from './app.component';
import { HeaderComponent } from './header/header.component';
import { TopNavigationComponent } from './top-navigation/top-navigation.component';
import { LoginComponent } from './login/login.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { NoAccessComponent } from './no-access/no-access.component';

import { AppRoutingModule } from './app-routing-module';
import { AuthService } from './common/services/auth.service';
import { OlddataService } from './common/services/olddata.service';
import { WebsocketPluginService } from './common/services/websocket-plugin.service';
import { TranslateService } from '@ngx-translate/core';

export function translateHttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

export function getBaseUrl() {
  return document.getElementsByTagName('base')[0].href;
}

export function jwtOptionsFactory(injector: Injector) {
  return {
    tokenGetter: () => {
      const authService = injector.get(AuthService);
      return authService.getToken();
    }
  };
}



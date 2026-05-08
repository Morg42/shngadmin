import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { Injector } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { TabsModule } from 'ngx-bootstrap/tabs';
import { AlertModule } from 'ngx-bootstrap/alert';
import { ModalModule } from 'ngx-bootstrap/modal';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { JwtModule, JWT_OPTIONS } from '@auth0/angular-jwt';

import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

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

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    TopNavigationComponent,
    LoginComponent,
    NotFoundComponent,
    NoAccessComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    JwtModule.forRoot({
      config: { throwNoTokenError: false },
      jwtOptionsProvider: {
        provide: JWT_OPTIONS,
        useFactory: jwtOptionsFactory,
        deps: [Injector],
      },
    }),
    BrowserAnimationsModule,
    TabsModule.forRoot(),
    AlertModule.forRoot(),
    ModalModule.forRoot(),
    FontAwesomeModule,
    NgOptimizedImage,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [
    { provide: 'BASE_URL', useFactory: getBaseUrl },
    OlddataService,
    WebsocketPluginService,
    TranslateService,
    JwtModule,
    provideHttpClient(withInterceptorsFromDi()),
    providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: false } } }),
  ],
})
export class AppModule {}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { sha512 } from 'js-sha512';
import { AppConfigService } from './app-config.service';
import { LogService } from './log.service';

interface DecodedJwtToken {
  exp: number;
  iat: number;
  name?: string;
  admin?: boolean;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  public jwtHelper = inject(JwtHelperService);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  // Token is stored in sessionStorage so it survives page reloads within the
  // same browser tab but is discarded when the tab is closed.
  private _token: string | null = null;

  /** Emits whenever the login state changes (login success / logout). */
  readonly loggedIn$ = new BehaviorSubject<boolean>(false);

  currentUser!: DecodedJwtToken | null;
  isLoginRequired: boolean;
  isLoginRequiredCount = 0;
  expiredLogin!: boolean;

  ttl: number = 0;
  renewAfter: number = 0;
  tokenRenewal: boolean;
  isRenewing: boolean;

  logTimestamp: number = 0;

  constructor() {
    this.isLoginRequired = true;
    this.tokenRenewal = true;
    this.isRenewing = false;

    const stored = sessionStorage.getItem('token');
    if (stored && !this.jwtHelper.isTokenExpired(stored)) {
      this._token = stored;
      this.currentUser = this.jwtHelper.decodeToken(stored);
      this.isLoginRequired = false;
      this.loggedIn$.next(true);
    }
  }

  getTimestamp() {
    return Math.round(new Date().getTime() / 1000);
  }

  login(credentials: { username: string; password: string }) {
    this.log.log('authService.login() entering');
    this.logTimestamp = this.getTimestamp();

    const send_hash = 'shNG0160$';
    const send_credentials: Record<string, string> = {};

    send_credentials.username = '';
    if (credentials.username !== '') {
      send_credentials.username = sha512(credentials.username + send_hash);
    }

    send_credentials.password = '';
    if (credentials.password !== '') {
      send_credentials.password = sha512(sha512(credentials.password) + send_hash);
    }

    const apiUrl = '/api/';
    this.log.log('login', apiUrl + 'authenticate/user', { send_credentials });
    return this.http
      .post<{ token?: string }>(apiUrl + 'authenticate/user', JSON.stringify(send_credentials))
      .pipe(
        map((response) => {
          const result = response;

          let anon = '';
          if (credentials.username === '') {
            anon = 'anonymous ';
          }
          if (result && result.token) {
            this._token = result.token;
            sessionStorage.setItem('token', this._token);
            this.currentUser = this.jwtHelper.decodeToken(this._token);
            const decodedToken = this.currentUser!;
            this.ttl = Math.round(((decodedToken.exp - decodedToken.iat) / 60 / 60) * 100) / 100;
            this.renewAfter = decodedToken.iat + (this.ttl * 60 * 60) / 2;
            this.tokenRenewal = true;
            this.isLoginRequired = !(credentials.username === '');
            this.log.log(anon + 'login:', 'success');
            this.expiredLogin = false;
            this.loggedIn$.next(true);
            return true;
          } else {
            this.log.log(anon + 'login:', 'fail');
            return false;
          }
        }),
      );
  }

  logout() {
    this._token = null;
    sessionStorage.removeItem('token');
    this.currentUser = null;
    this.loggedIn$.next(false);
  }

  loginRequired() {
    return this.isLoginRequired;
  }

  getNewToken() {
    const apiUrl = '/api/';
    this.log.log('getNewToken', apiUrl + 'authenticate/renew');
    return this.http
      .put<{ token: string }>(apiUrl + 'authenticate/renew', '')
      .pipe(map((response) => response.token));
  }

  renewToken() {
    this.log.warn('authService.renewToken()');

    if (this.isRenewing) {
      this.log.warn('renewToken: Already renewing');
      return;
    }

    this.logTimestamp = this.getTimestamp();
    const oldToken = this._token ?? '';
    let newToken: string = oldToken;
    this.isRenewing = true;
    this.getNewToken()
      .pipe(take(1))
      .subscribe((response) => {
        newToken = response;
        const decodedNewToken = this.jwtHelper.decodeToken(newToken);
        if (oldToken === newToken) {
          this.log.warn('- Token renewal is disabled');
          this.tokenRenewal = false;
        } else {
          this._token = newToken;
          sessionStorage.setItem('token', newToken);
          this.ttl =
            Math.round(((decodedNewToken.exp - decodedNewToken.iat) / 60 / 60) * 100) / 100;
          this.renewAfter = decodedNewToken.iat + (this.ttl * 60 * 60) / 2;
        }
        this.isRenewing = false;
      });
  }

  isLoggedIn(): boolean {
    this.log.log('AuthService.isLoggedIn() entered');
    const token = this._token;
    if (token === null) {
      this.log.log('AuthService.isLoggedIn() no token --> leaving');
      return false;
    }

    const decodedToken = this.jwtHelper.decodeToken(token);
    const timestamp = this.getTimestamp();
    if (this.ttl === 0) {
      this.ttl = Math.round(((decodedToken.exp - decodedToken.iat) / 60 / 60) * 100) / 100;
      this.renewAfter = decodedToken.iat + (this.ttl * 60 * 60) / 2;
    }
    if (this.renewAfter === 0) {
      this.renewAfter = decodedToken.iat + (this.ttl * 60 * 60) / 2;
    }

    const loggedIn = !this.jwtHelper.isTokenExpired(token);

    if (loggedIn && this.logTimestamp < timestamp) {
      this.log.log(
        'Login expires in ' + Math.round((decodedToken.exp - timestamp) / 6) / 10 + ' Min',
      );
      if (this.tokenRenewal) {
        this.log.log(
          'Login renew in ' + Math.round((this.renewAfter - timestamp) / 6) / 10 + ' Min',
        );
      }
      this.logTimestamp = timestamp + 60;
    }

    if (decodedToken.exp !== null) {
      if (!this.expiredLogin) {
        this.expiredLogin = this.jwtHelper.isTokenExpired(token);
        if (this.expiredLogin) {
          this.log.warn('Token expired', { decodedToken });
        }
      } else {
        this.log.warn('Token already expired');
      }

      if (this.tokenRenewal && loggedIn && this.renewAfter < timestamp) {
        this.renewToken();
      }
      this.log.log('AuthService.isLoggedIn() return ', { loggedIn });
      return loggedIn;
    }

    return false;
  }

  getToken(): string | null {
    return this._token;
  }

  isSecuredByLogin(): boolean {
    return true;
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { sha512 } from 'js-sha512';
import { AppConfigService } from './app-config.service';

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

  /** Emits whenever the login state changes (login success / logout). */
  readonly loggedIn$ = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));

  currentUser: DecodedJwtToken | null;
  isLoginRequired: boolean;
  isLoginRequiredCount = 0;
  expiredLogin: boolean;

  ttl: number = 0; // time to live for jwt token
  renewAfter: number = 0;
  tokenRenewal: boolean;
  isRenewing: boolean;

  logTimestamp: number = 0;

  constructor() {
    this.isLoginRequired = true;
    const token = localStorage.getItem('token');

    this.tokenRenewal = true;
    this.isRenewing = false;

    // const timestamp = this.getTimestamp();
    // const decodedToken = this.jwtHelper.decodeToken(localStorage.getItem('token'));
    // console.warn('authService.constructor', {decodedToken} , this.logTimestamp, {timestamp}, this.logTimestamp < timestamp, this.logTimestamp - timestamp);
  }

  getTimestamp() {
    return Math.round(new Date().getTime() / 1000);
  }

  login(credentials) {
    console.log('authService.login() entering');
    this.logTimestamp = this.getTimestamp();
    // console.log('timestamp', this.logTimestamp);
    // this.logTimestamp += 500;

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

    const hostip = this.appConfig.hostIp;

    /*if (hostip === 'localhost') {
      console.log('authService.login() entering special case',{hostip});
      if (credentials.username === '') { 
        return of(false);
      }

      // After login:
      /!** the following token includes:
       * eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 ==>
       * {
       *   "alg": "HS256",
       *   "typ": "JWT"
       * }
       * eyJuYW1lIjoiQXV0b2xvZ2luIiwiYWRtaW4iOnRydWUsImV4cCI6MTU0NjIzOTAyMiwiaWF0IjoxNTE2MjM5MDIyfQ ==>
       * {
       *   "name": "Autologin",
       *   "admin": true,
       *   "exp": 1546239022, // expiration date 31.12.2018 7:50:22 GMT+0100  (MEZ)
       *   "iat": 1516239022  // issued at 31.01.2018 2:30:22 GMT+0100  (MEZ)
       * }
       * GpSSzk5SicKgGttwiVFq5xdOK7SM8KHU9992RBDUETU ==> secret
       *!/
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQXV0b2xvZ2luIiwiYWRtaW4iOnRydWUsImV4cCI6MTU0NjIzOTAyMiwiaWF0IjoxNTE2MjM5MDIyfQ.GpSSzk5SicKgGttwiVFq5xdOK7SM8KHU9992RBDUETU');

      this.currentUser = this.jwtHelper.decodeToken(localStorage.getItem('token'));
      // if (this.currentUser.ttl !== undefined) {
      //   this.ttl = this.currentUser.ttl;
      // }
      this.renewAfter = this.currentUser.iat + (this.ttl*60*60 / 2);
      const decodedToken = this.currentUser;
      console.log('authService.login (localhost)', this.ttl, {decodedToken}, this.renewAfter);

      // if login succeeds with an empty username, no login is required
      this.isLoginRequired = !(credentials.username === '');
      this.expiredLogin = false;
      console.log('authService.login() leaving special case',{hostip});

      return of(true);
    }
*/
    // if not in develop environment:
    // return this.http.post('http://smarthomeng.fritz.box:1234/api/authenticate/user', JSON.stringify(send_credentials))
    // const apiUrl = sessionStorage.getItem('apiUrl');
    const apiUrl = '/api/';
    console.log('login', apiUrl + 'authenticate/user', { send_credentials });
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
            localStorage.setItem('token', result.token);

            const jwt = new JwtHelperService();
            // this.currentUser = jwt.decodeToken(localStorage.getItem('token'));
            this.currentUser = this.jwtHelper.decodeToken(localStorage.getItem('token')!);
            // if (this.currentUser.ttl !== undefined) {
            //   this.ttl = this.currentUser.ttl;
            // }
            const decodedToken = this.currentUser!;
            this.ttl = Math.round(((decodedToken.exp - decodedToken.iat) / 60 / 60) * 100) / 100;
            this.renewAfter = decodedToken.iat + (this.ttl * 60 * 60) / 2;
            this.tokenRenewal = true;

            // console.log('authService.login', this.ttl, {decodedToken}, this.renewAfter);

            // if login succeeds with an empty username, no login is required
            this.isLoginRequired = !(credentials.username === '');

            console.log(anon + 'login:', 'success');
            this.expiredLogin = false;
            this.loggedIn$.next(true);
            return true;
          } else {
            console.log(anon + 'login:', 'fail');
            return false;
          }
        }),
      );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUser = null;
    this.loggedIn$.next(false);
  }

  loginRequired() {
    return this.isLoginRequired;
  }

  getNewToken() {
    // return this.http.post('http://smarthomeng.fritz.box:1234/api/authenticate/user', JSON.stringify(send_credentials))
    // const apiUrl = sessionStorage.getItem('apiUrl');
    const apiUrl = '/api/';
    console.log('getNewToken', apiUrl + 'authenticate/renew');
    return this.http.put<{ token: string }>(apiUrl + 'authenticate/renew', '').pipe(
      map((response) => {
        return response.token;
      }),
    );
  }

  renewToken() {
    console.warn('authService.renewToken()');

    if (this.isRenewing) {
      console.warn('renewToken: Already renewing');
      return;
    }

    this.logTimestamp = this.getTimestamp();
    const oldToken: string = localStorage.getItem('token') ?? '';
    const hostip: string = this.appConfig.hostIp;

    let newToken: string = oldToken;
    this.isRenewing = true;
    this.getNewToken()
      .pipe(take(1))
      .subscribe((response) => {
        newToken = response;
        const decodedNewToken = this.jwtHelper.decodeToken(newToken);
        const newttl =
          Math.round(((decodedNewToken.exp - decodedNewToken.iat) / 60 / 60) * 100) / 100;
        // console.log('authService.renewToken', {decodedNewToken});

        if (oldToken === newToken) {
          console.warn('- Token renewal is disabled');
          this.tokenRenewal = false;
        } else {
          localStorage.setItem('token', newToken);
          this.ttl =
            Math.round(((decodedNewToken.exp - decodedNewToken.iat) / 60 / 60) * 100) / 100;
          this.renewAfter = decodedNewToken.iat + (this.ttl * 60 * 60) / 2;
        }
        this.isRenewing = false;
      });
  }

  isLoggedIn(): boolean {
    console.log('AuthService.isLoggedIn() entered');
    const token = localStorage.getItem('token');
    if (token === null) {
      console.log('AuthService.isLoggedIn() localStorage token is null --> leaving');
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

    const expirationDate = this.jwtHelper.getTokenExpirationDate(
      localStorage.getItem('token') ?? undefined,
    );
    const loggedIn = !this.jwtHelper.isTokenExpired(localStorage.getItem('token') ?? undefined);

    if (loggedIn && this.logTimestamp < timestamp) {
      console.log(
        'Login expires in ' + Math.round((decodedToken.exp - timestamp) / 6) / 10 + ' Min',
      );
      if (this.tokenRenewal) {
        console.log(
          'Login renew in ' + Math.round((this.renewAfter - timestamp) / 6) / 10 + ' Min',
        );
      }

      const timeLeftMin = (decodedToken.exp - timestamp) / 60;
      this.logTimestamp = timestamp + 60;
    }

    if (decodedToken.exp !== null) {
      const hostip = this.appConfig.hostIp;
      if (!this.expiredLogin) {
        this.expiredLogin = this.jwtHelper.isTokenExpired(
          localStorage.getItem('token') ?? undefined,
        );
        if (this.expiredLogin) {
          console.warn('Token expired', { decodedToken });
        }
      } else {
        console.warn('Token already expired');
      }

      if (this.tokenRenewal && loggedIn && this.renewAfter < timestamp) {
        this.renewToken();
      }
      console.log('AuthService.isLoggedIn() return ', { loggedIn });
      return loggedIn;
    }

    if (token === null || decodedToken.iat === null) {
      console.log(
        'AuthService.isLoggedIn() token and decodedToken.iat are both null --> return false',
      );
      return false;
    }

    return true;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isSecuredByLogin(): boolean {
    return true;
  }
}

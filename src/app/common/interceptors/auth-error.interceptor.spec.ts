/**
 * authErrorInterceptor tests
 *
 * Covers: a 401 of an /api/ request (except the login request itself) drops the token; with login required
 * the user is sent to /login with the current URL as returnUrl, without login required a new anonymous
 * token is fetched. Other errors and the login request pass through unchanged.
 */
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AppConfigService } from '../services/app-config.service';
import { AuthService } from '../services/auth.service';
import { authErrorInterceptor } from './auth-error.interceptor';

describe('authErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: { logout: jest.Mock; ensureLoggedIn: jest.Mock };
  let router: { url: string; navigate: jest.Mock };
  let loginRequired: boolean | null;

  beforeEach(() => {
    auth = { logout: jest.fn(), ensureLoggedIn: jest.fn(() => of(true)) };
    router = { url: '/items?select=a.b', navigate: jest.fn(() => Promise.resolve(true)) };
    loginRequired = true;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        {
          provide: AppConfigService,
          useValue: {
            get snapshot() {
              return { loginRequired };
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function failWith(url: string, status: number) {
    let error: { status?: number } | undefined;
    http.get(url).subscribe({ error: (e) => (error = e) });
    backend.expectOne(url).flush({ error: 'x' }, { status, statusText: 'x' });
    return error;
  }

  it('drops the token and sends the user to the login page on 401', () => {
    const error = failWith('/api/items/', 401);

    expect(error?.status).toBe(401);
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/items?select=a.b' },
    });
  });

  it('fetches a new anonymous token instead when no login is required', () => {
    loginRequired = false;

    failWith('/api/items/', 401);

    expect(auth.logout).toHaveBeenCalled();
    expect(auth.ensureLoggedIn).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not redirect while already on the login page', () => {
    router.url = '/login?returnUrl=%2Fitems';

    failWith('/api/items/', 401);

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('leaves a rejected login request to the login form', () => {
    failWith('/api/authenticate/user', 401);

    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ignores other errors', () => {
    const error = failWith('/api/items/', 500);

    expect(error?.status).toBe(500);
    expect(auth.logout).not.toHaveBeenCalled();
  });
});

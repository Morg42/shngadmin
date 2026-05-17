import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { JwtModule } from '@auth0/angular-jwt';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { AuthService } from './auth.service';
import { UserPreferencesService } from './user-preferences.service';

function tokenFactory(): string | null {
  return sessionStorage.getItem('token');
}

const PROVIDERS = [
  provideHttpClient(),
  provideHttpClientTesting(),
  AuthService,
  UserPreferencesService,
  { provide: AppConfigService, useValue: createMockAppConfigService() },
];

describe('AuthService (no token)', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [JwtModule.forRoot({ config: { tokenGetter: tokenFactory } })],
      providers: PROVIDERS,
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    sessionStorage.clear();
    TestBed.inject(HttpTestingController).verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loggedIn$ starts false when no token in sessionStorage', () => {
    expect(service.loggedIn$.getValue()).toBe(false);
  });

  it('logout() removes token from sessionStorage and emits false', () => {
    sessionStorage.setItem('token', 'fake-token');
    service.logout();
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(service.loggedIn$.getValue()).toBe(false);
  });

  it('isLoggedIn() returns false when no token present', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it('getToken() returns null when no token set', () => {
    expect(service.getToken()).toBeNull();
  });

  it('loginRequired() returns true (default constructor state)', () => {
    expect(service.loginRequired()).toBe(true);
  });
});

// Valid JWT with no expiry claim — passes decodeToken without throwing.
const VALID_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('AuthService (token in sessionStorage)', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('token', VALID_JWT);
    TestBed.configureTestingModule({
      imports: [JwtModule.forRoot({ config: { tokenGetter: tokenFactory } })],
      providers: PROVIDERS,
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    sessionStorage.clear();
    TestBed.inject(HttpTestingController).verify();
  });

  it('loggedIn$ starts true when token is present in sessionStorage', () => {
    expect(service.loggedIn$.getValue()).toBe(true);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { JwtModule } from '@auth0/angular-jwt';
import { createMockAppConfigService } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { AuthService } from './auth.service';
import { UserPreferencesService } from './user-preferences.service';

function tokenFactory(): string | null {
  return localStorage.getItem('token');
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
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [JwtModule.forRoot({ config: { tokenGetter: tokenFactory } })],
      providers: PROVIDERS,
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.inject(HttpTestingController).verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loggedIn$ starts false when no token in localStorage', () => {
    expect(service.loggedIn$.getValue()).toBe(false);
  });

  it('logout() removes token from localStorage and emits false', () => {
    localStorage.setItem('token', 'fake-token');
    service.logout();
    expect(localStorage.getItem('token')).toBeNull();
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

describe('AuthService (token in localStorage)', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'some-token');
    TestBed.configureTestingModule({
      imports: [JwtModule.forRoot({ config: { tokenGetter: tokenFactory } })],
      providers: PROVIDERS,
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.inject(HttpTestingController).verify();
  });

  it('loggedIn$ starts true when token is present in localStorage', () => {
    expect(service.loggedIn$.getValue()).toBe(true);
  });
});

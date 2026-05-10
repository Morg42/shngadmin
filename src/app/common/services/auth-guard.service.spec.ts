import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthGuardService } from './auth-guard.service';
import { AuthService } from './auth.service';

// configureTestingModule MUST be called in beforeEach, not inside it()

describe('AuthGuardService — when logged in', () => {
  let guard: AuthGuardService;
  const mockAuthService = { isLoggedIn: () => true };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AuthGuardService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    guard = TestBed.inject(AuthGuardService);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('canActivate returns true', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;
    const result = guard.canActivate(route, state);
    expect(result).toBe(true);
  });
});

describe('AuthGuardService — when not logged in', () => {
  let guard: AuthGuardService;
  const mockAuthService = { isLoggedIn: () => false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AuthGuardService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    guard = TestBed.inject(AuthGuardService);
  });

  it('canActivate returns a UrlTree redirecting to /login', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;
    const result = guard.canActivate(route, state);
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/login');
  });

  it('includes returnUrl query param set to the requested URL', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/items' } as RouterStateSnapshot;
    const result = guard.canActivate(route, state) as UrlTree;
    expect(result.queryParams['returnUrl']).toBe('/items');
  });
});

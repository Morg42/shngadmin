import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AppConfigService } from '../services/app-config.service';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

async function runGuard(state: RouterStateSnapshot): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, state),
  );
  return isObservable(result)
    ? firstValueFrom(result)
    : Promise.resolve(result as boolean | UrlTree);
}

const mockState = (url: string) => ({ url }) as RouterStateSnapshot;

describe('authGuard — already logged in', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => true } },
        {
          provide: AppConfigService,
          useValue: { authReady$: of(true) },
        },
      ],
    });
  });

  it('returns true', async () => {
    const result = await runGuard(mockState('/system'));
    expect(result).toBe(true);
  });
});

describe('authGuard — not logged in, login NOT required', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
        {
          provide: AppConfigService,
          useValue: { authReady$: of(false) },
        },
      ],
    });
  });

  it('resolves to true (no login required)', async () => {
    const result = await runGuard(mockState('/system'));
    expect(result).toBe(true);
  });
});

describe('authGuard — not logged in, login IS required', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
        {
          provide: AppConfigService,
          useValue: { authReady$: of(true) },
        },
      ],
    });
  });

  it('resolves to a UrlTree redirecting to /login', async () => {
    const result = await runGuard(mockState('/system'));
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/login');
  });

  it('includes the returnUrl query param', async () => {
    const result = await runGuard(mockState('/items'));
    expect((result as UrlTree).queryParams['returnUrl']).toBe('/items');
  });
});

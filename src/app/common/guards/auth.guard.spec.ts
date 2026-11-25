import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, NEVER, of } from 'rxjs';
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
  it('resolves to true once ensureLoggedIn() settles successfully', async () => {
    const ensureLoggedIn = jest.fn(() => of(true));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => false, ensureLoggedIn } },
        { provide: AppConfigService, useValue: { authReady$: of(false) } },
      ],
    });

    const result = await runGuard(mockState('/system'));

    expect(result).toBe(true);
    expect(ensureLoggedIn).toHaveBeenCalled();
  });

  it('still resolves to true when the anonymous login attempt itself fails', async () => {
    // A failed/slow anonymous login shouldn't force a login wall the
    // server said isn't required - the route just constructs with
    // whatever auth state exists (matching prior behaviour for the
    // "server unreachable" case, now applied deliberately here too).
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isLoggedIn: () => false, ensureLoggedIn: () => of(false) },
        },
        { provide: AppConfigService, useValue: { authReady$: of(false) } },
      ],
    });

    const result = await runGuard(mockState('/system'));

    expect(result).toBe(true);
  });

  it('still resolves to true when ensureLoggedIn() never settles (timeout)', async () => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isLoggedIn: () => false, ensureLoggedIn: () => NEVER },
        },
        { provide: AppConfigService, useValue: { authReady$: of(false) } },
      ],
    });

    const resultPromise = runGuard(mockState('/system'));
    jest.advanceTimersByTime(3000);
    const result = await resultPromise;

    expect(result).toBe(true);
    jest.useRealTimers();
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

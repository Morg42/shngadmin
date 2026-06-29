import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';

import { Location } from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { Toast } from 'primeng/toast';
import { OfflineBannerComponent } from './common/components/offline-banner/offline-banner.component';
import { AuthService } from './common/services/auth.service';
import { LogService } from './common/services/log.service';
import { UserPreferencesService } from './common/services/user-preferences.service';
import { TopNavigationComponent } from './top-navigation/top-navigation.component';
// git-version.auto.ts is generated at build time by scripts/generate-version.js
import { APP_VERSION, GIT_BRANCH, GIT_COMMIT, GIT_REF } from './git-version.auto';

// Allow ngx-translate to find translation files on other path than /assets/i18n/...
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Exported as module-level constants so other modules can import them
// directly without injecting AppComponent.
export const APP_NAME = 'shngAdmin';
export { APP_VERSION };

// Detailed version string matching the format SmartHomeNG core uses:
//   v{semver}-{short-hash}.{branch}  ({ref})
// Populated from git-version.auto.ts which is regenerated on every build
// via the prebuild/prestart npm hooks.
export const APP_VERSION_DETAIL = `v${APP_VERSION}-${GIT_COMMIT}.${GIT_BRANCH}`;
export const APP_VERSION_REF = `(${GIT_REF})`;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopNavigationComponent, RouterOutlet, OfflineBannerComponent, Toast, TranslatePipe],
})
export class AppComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly log = inject(LogService);
  private translate = inject(TranslateService);
  public authService = inject(AuthService);
  private titleService = inject(Title);
  private userPrefs = inject(UserPreferencesService);
  private router = inject(Router);
  private location = inject(Location);

  public APP_NAME = APP_NAME;
  public APP_VERSION = APP_VERSION;

  title = 'shngadmin';
  navigating = false;

  constructor() {
    this.log.log('AppComponent.constructor:');

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.navigating = true;
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.navigating = false;

        // Strip the cache-busting _cb parameter injected by checkForUpdate()
        // after a stale-frontend reload.  Use Location.replaceState (not
        // router.navigate) so no secondary navigation is triggered — a
        // router.navigate would re-run canActivate guards and could cause a
        // spurious /login redirect.
        if (event instanceof NavigationEnd && event.urlAfterRedirects.includes('_cb=')) {
          const [path, qs] = event.urlAfterRedirects.split('?');
          const params = new URLSearchParams(qs ?? '');
          params.delete('_cb');
          const clean = params.size ? `${path}?${params}` : path;
          this.location.replaceState(clean);
        }
      }
      this.cdr.markForCheck();
    });

    this.translate.addLangs(['en', 'de', 'fr']);

    // Use saved preference immediately so the correct translation file is loaded
    // before the first render.  Priority: explicit user choice > cached server
    // language (written after the first successful getServerinfo()) > 'en'.
    const initialLang = this.userPrefs.language ?? this.userPrefs.cachedServerLanguage ?? 'en';
    this.translate.setDefaultLang(initialLang);
    this.translate.use(initialLang);
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('AppComponent was loaded');
    // getServerBasicinfo() is called in main.ts APP_INITIALIZER, so wsPort and
    // shng_serverinfo are already populated before any route guard runs.
  }
}

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

import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { Toast } from 'primeng/toast';
import { OfflineBannerComponent } from './common/components/offline-banner/offline-banner.component';
import { ServerInfo } from './common/models/server-info';
import { AuthService } from './common/services/auth.service';
import { LogService } from './common/services/log.service';
import { ServerApiService } from './common/services/server-api.service';
import { SharedService } from './common/services/shared.service';
import { UserPreferencesService } from './common/services/user-preferences.service';
import { TopNavigationComponent } from './top-navigation/top-navigation.component';

// Allow ngx-translate to find translation files on other path than /assets/i18n/...
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Exported as module-level constants so other modules can import them
// directly without injecting AppComponent.
export const APP_NAME = 'shngAdmin';
export const APP_VERSION = '1.12.0';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopNavigationComponent, RouterOutlet, OfflineBannerComponent, Toast],
})
export class AppComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly log = inject(LogService);
  private http = inject(HttpClient);
  private dataService = inject(ServerApiService);
  private translate = inject(TranslateService);
  private shared = inject(SharedService);
  public authService = inject(AuthService);
  private titleService = inject(Title);
  private userPrefs = inject(UserPreferencesService);

  public APP_NAME = APP_NAME;
  public APP_VERSION = APP_VERSION;

  title = 'shngadmin';

  constructor() {
    this.log.log('AppComponent.constructor:');

    this.translate.addLangs(['en', 'de', 'fr']);

    // Use saved user preference immediately; server may refine it later via
    // ServerApiService if no preference has been saved yet.
    const initialLang = this.userPrefs.language ?? 'en';
    this.translate.setDefaultLang(initialLang);
    this.translate.use(initialLang);
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('AppComponent was loaded');

    this.dataService
      .getServerBasicinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ServerInfo) => {
          this.dataService.shng_serverinfo = response;
          this.shared.setGuiLanguage();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.log.warn('DataService: getServerBasicinfo():', { error });
        },
      });
  }
}

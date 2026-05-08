import {Component, OnInit, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Title} from '@angular/platform-browser';
import {HttpClient} from '@angular/common/http';

import {TranslateService} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {ServerApiService} from './common/services/server-api.service';
import {AuthService} from './common/services/auth.service';
import {ServerInfo} from './common/models/server-info';
import {SharedService} from './common/services/shared.service';


// Allow ngx-translate to find translation files on other path than /assets/i18n/...
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class AppComponent implements OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  public APP_NAME = 'shngAdmin';
  public APP_VERSION = '0.9.18';

  title = 'shngadmin';

  constructor(private http: HttpClient,
              private dataService: ServerApiService,
              private translate: TranslateService,
              private shared: SharedService,
              public authService: AuthService,
              private titleService: Title) {

    console.log('AppComponent.constructor:');

    translate.addLangs(['en']);
    translate.addLangs(['de']);
    translate.addLangs(['fr']);

    translate.setDefaultLang('de');
    translate.use('de');

    console.log('AppComponent.constructor getServerBasicInfo:');
    //    this.dataService.getServerBasicinfo()
    this.dataService.getServerBasicinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response: ServerInfo) => {
          this.dataService.shng_serverinfo = response;

          this.shared.setGuiLanguage();
          this.cdr.markForCheck();
        },
        (error) => {
          console.warn('DataService: getServerBasicinfo():', {error});
        }
      );
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }


  ngOnInit() {
    console.log('AppComponent was loaded');
  }

}


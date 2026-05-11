import { NgOptimizedImage } from '@angular/common';
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
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AppConfigService } from '../common/services/app-config.service';
import { AuthService } from '../common/services/auth.service';
import { ServerApiService } from '../common/services/server-api.service';
import { SharedService } from '../common/services/shared.service';

interface MenuEntry {
  label: string;
  routerLink?: string[];
}
interface MenuItem {
  label: string;
  routerLink?: string[];
  visible: boolean;
  items: MenuEntry[];
}

@Component({
  selector: 'app-top-navigation',
  templateUrl: './top-navigation.component.html',
  styleUrls: ['./top-navigation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, TranslatePipe],
})
export class TopNavigationComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  public shared = inject(SharedService);
  private dataServiceServer = inject(ServerApiService);
  protected router = inject(Router);
  public authService = inject(AuthService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);

  labels: string[] = [];
  menu: MenuItem[] = [];
  loggedIn = false;
  loginRequired = false;

  developerMode = false;
  isTouchDevice = false;

  constructor() {
    console.log('TopNavigationComponent - constructor()');
  }

  ngOnInit() {
    console.log('TopNavigationComponent.ngOnInit() entered');

    // One-shot initialisation: load server config, set up translate, attempt
    // anonymous login.  After this the component reacts purely via observables.
    this.dataServiceServer
      .getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.developerMode = this.appConfig.developerMode;
        this.isTouchDevice = !this.appConfig.clickDropdownHeader;

        this.setTitle(this.translate.instant('SmartHomeNG'));

        const credentials = { username: '', password: '' };
        console.log('signIn', { credentials });
        this.authService
          .login(credentials)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((result: boolean) => {
            console.log('Anonymous login:', { result });
            // loggedIn$ will fire from AuthService.login() on success,
            // triggering buildMenu() + markForCheck() via the subscription below.
          });
      });

    // Rebuild menu after the translation file for the new language has loaded.
    // Using onLangChange (not appConfig.config$) because translate.use() is
    // async — config$ fires before the new translations are available, causing
    // translate.instant() to return keys from the previous language.
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.buildMenu();
      this.cdr.markForCheck();
    });

    // Sync loggedIn / loginRequired whenever auth state changes.
    // Only rebuild the menu if translations are already loaded; if not,
    // onLangChange will call buildMenu() once they arrive.
    this.authService.loggedIn$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loggedIn) => {
      this.loggedIn = loggedIn;
      this.loginRequired = this.authService.loginRequired();
      if (this.translate.currentLang) {
        this.buildMenu();
      }
      this.cdr.markForCheck();
    });

    console.log('TopNavigationComponent.ngOnInit() leaving');
  }

  // Label of the section whose dropdown is currently forced open (touch mode).
  openMenuLabel: string | null = null;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  toggleResponsiveMenu() {
    console.log('TopNavigationComponent.toggleResponsiveMenu');
    const x = document.getElementById('myTopnav');
    if (x === null) return;

    if (x.className === 'topnav') {
      x.className += ' responsive';
    } else {
      x.className = 'topnav';
    }
  }

  enableDropdownMenu() {
    const x = document.getElementsByClassName('dropdown-content-hidden');
    for (let i = 0; i < x.length; i++) {
      x[i].className = 'dropdown-content';
    }
  }

  disableResponsiveMenu(menuEntry, hideDropdown: boolean = true) {
    this.closeTouchDropdown();

    // disable dropped down menu if in mobile mode
    const m = document.getElementById('myTopnav');
    if (m === null) return;

    m.className = 'topnav';

    // hide dropdown after clicking on it (for menu in desktop mode)
    if (hideDropdown) {
      const x = document.getElementById('menu-' + menuEntry.label);
      if (x === null) return;
      x.className = 'dropdown-content-hidden';
    }
  }

  onMenuHeaderClick(menuEntry: MenuItem) {
    if (this.isTouchDevice) {
      if (this.openMenuLabel === menuEntry.label) {
        // Second tap while dropdown is open → navigate to first sub-item
        const firstItem = menuEntry.items[0];
        if (firstItem?.routerLink) {
          this.router.navigate(firstItem.routerLink);
        }
        this.closeTouchDropdown();
      } else {
        // First tap → open this dropdown, close any other
        this.closeTouchDropdown();
        document.getElementById('menu-' + menuEntry.label)?.classList.add('dropdown-touch-open');
        this.openMenuLabel = menuEntry.label;
      }
    } else {
      // Desktop: dropdown was visible via hover → navigate to first sub-item
      const firstItem = menuEntry.items[0];
      if (firstItem?.routerLink) {
        this.router.navigate(firstItem.routerLink);
      }
      this.disableResponsiveMenu(menuEntry, false);
    }
  }

  private closeTouchDropdown() {
    document
      .querySelectorAll('.dropdown-touch-open')
      .forEach((el) => el.classList.remove('dropdown-touch-open'));
    this.openMenuLabel = null;
  }

  setMenuEntry(menu: number, label: string, routerLink: string[] = [], visible: boolean = true) {
    while (this.menu.length < menu + 1) {
      this.menu.push({ label: 'dummy', visible: visible, items: [] });
    }
    this.menu[menu].label = label;
    this.menu[menu].routerLink = routerLink;
    this.menu[menu].visible = visible;
  }

  setSubmenuEntry(menu: number, submenu: number, label: string, routerLink: string[]) {
    while (this.menu[menu].items.length < submenu + 1) {
      this.menu[menu].items.push({ label: 'dummy' });
    }
    this.menu[menu].items[submenu].label = label;
    this.menu[menu].items[submenu].routerLink = routerLink;
  }

  buildMenu() {
    console.log('TopNavigationComponent.buildMenu entering');
    console.log(
      'TopNavigationComponent.buildMenu: default_language=',
      this.appConfig.defaultLanguage,
    );

    this.setMenuEntry(0, this.translate.instant('MENU.SYSTEM'), ['/system/systemproperties']);
    this.setSubmenuEntry(0, 0, this.translate.instant('MENU.SYSTEM_PROPERTIES'), [
      '/system/systemproperties',
    ]);
    this.setSubmenuEntry(0, 1, this.translate.instant('MENU.SYSTEM_CONFIGURATION'), [
      '/system/config',
    ]);

    this.setMenuEntry(1, this.translate.instant('MENU.SERVICES'), ['/services']);
    this.setSubmenuEntry(1, 0, this.translate.instant('MENU.SERVICES'), ['/services']);
    this.setSubmenuEntry(1, 1, this.translate.instant('MENU.FUNCTION_CONFIGURATION'), [
      '/services/functions',
    ]);

    this.setMenuEntry(2, this.translate.instant('MENU.ITEMS'), ['/item_tree']);
    this.setSubmenuEntry(2, 0, this.translate.instant('MENU.ITEM_TREE'), ['/item_tree']);
    this.setSubmenuEntry(2, 1, this.translate.instant('MENU.ITEM_CONFIGURATION'), [
      '/items/config',
    ]);
    if (this.developerMode === true && false) {
      this.setSubmenuEntry(2, 2, this.translate.instant('MENU.ITEM_CONFIGURATION') + ' (dev)', [
        '/items/config2',
      ]);
      this.setSubmenuEntry(2, 3, this.translate.instant('MENU.ITEM_STRUCTS'), ['/items/structs']);
      this.setSubmenuEntry(2, 4, this.translate.instant('MENU.ITEM_STRUCT_CONFIGURATION'), [
        '/items/struct_config',
      ]);
    } else {
      this.setSubmenuEntry(2, 2, this.translate.instant('MENU.ITEM_STRUCTS'), ['/items/structs']);
      this.setSubmenuEntry(2, 3, this.translate.instant('MENU.ITEM_STRUCT_CONFIGURATION'), [
        '/items/struct_config',
      ]);
    }

    this.setMenuEntry(3, this.translate.instant('MENU.LOGICS'), ['/logics-list']);
    this.setSubmenuEntry(3, 0, this.translate.instant('MENU.LOGICS_LIST'), ['/logics-list']);
    this.setSubmenuEntry(3, 1, this.translate.instant('MENU.LOGICS_GROUPS'), ['/logics-groups']);

    this.setMenuEntry(4, this.translate.instant('MENU.PLUGINS'), ['/plugins_list']);
    this.setSubmenuEntry(4, 0, this.translate.instant('MENU.PLUGINS_LIST'), ['/plugins_list']);
    this.setSubmenuEntry(4, 1, this.translate.instant('MENU.PLUGINS_CONFIGURATION'), [
      '/plugins/config',
    ]);

    this.setMenuEntry(5, this.translate.instant('MENU.SCENES'), ['/scenes/list']);
    this.setSubmenuEntry(5, 0, this.translate.instant('MENU.SCENE_LIST'), ['/scenes/list']);
    this.setSubmenuEntry(5, 1, this.translate.instant('MENU.SCENE_CONFIGURATION'), [
      '/scenes/config',
    ]);

    this.setMenuEntry(6, this.translate.instant('MENU.SCHEDULERS'), ['/schedulers']);
    this.setSubmenuEntry(6, 0, this.translate.instant('MENU.SCHEDULERS'), ['/schedulers']);
    this.setSubmenuEntry(6, 1, this.translate.instant('MENU.THREADS'), ['/threads']);

    this.setMenuEntry(7, this.translate.instant('MENU.LOGS'), ['/logs/display']);
    this.setSubmenuEntry(7, 0, this.translate.instant('MENU.LOGS_DISPLAY'), ['/logs/display']);
    this.setSubmenuEntry(7, 1, this.translate.instant('MENU.LOGGER_CONFIGURATION'), [
      '/logs/logger-list',
    ]);
    this.setSubmenuEntry(7, 2, this.translate.instant('MENU.LOGGING_CONFIGURATION'), [
      '/logs/logging-configuration',
    ]);
    console.log('TopNavigationComponent.buildMenu leaving');
  }

  logout() {
    if (this.loggedIn && this.loginRequired) {
      this.router.navigate(['/login']);
      this.authService.logout();
    }
  }
}

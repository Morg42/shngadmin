import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { AppConfigService } from '../common/services/app-config.service';
import { AuthService } from '../common/services/auth.service';
import { LogService } from '../common/services/log.service';
import { ServerApiService } from '../common/services/server-api.service';
import { SharedService } from '../common/services/shared.service';
import { ThemeService } from '../common/services/theme.service';

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

// Maps the first URL segment (Angular route) to the matching Sphinx docs
// page under doc/user/source/admin/*.rst, so the Help link opens the page
// relevant to whatever section of the AdminUI the user is currently in.
const HELP_PAGE_BY_ROUTE: Record<string, string> = {
  system: 'system',
  services: 'dienste',
  items: 'items',
  logics: 'logiken',
  schedulers: 'scheduler',
  threads: 'threads',
  plugins: 'plugins',
  scenes: 'scenes',
  logs: 'logs',
};

@Component({
  selector: 'app-top-navigation',
  templateUrl: './top-navigation.component.html',
  styleUrls: ['./top-navigation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, TranslatePipe],
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
  private readonly log = inject(LogService);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  protected theme = inject(ThemeService);

  private readonly topnavEl = viewChild.required<ElementRef<HTMLElement>>('topnav');

  labels: string[] = [];
  readonly menu = signal<MenuItem[]>([]);
  readonly loggedIn = signal(false);
  readonly loginRequired = signal(false);

  isTouchDevice = false;

  /** Current URL as a signal; drives the context-sensitive Help link.
   *  Replaces the old NavigationEnd->markForCheck subscription: the Help
   *  getters read this signal, so navigation refreshes them under OnPush. */
  private readonly currentUrl = signal('/');

  constructor() {
    this.log.log('TopNavigationComponent - constructor()');
  }

  ngOnInit() {
    this.log.log('TopNavigationComponent.ngOnInit() entered');

    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.currentUrl.set(this.router.url));

    // One-shot initialisation: load server config, set up translate, attempt
    // anonymous login.  After this the component reacts purely via observables.
    this.dataServiceServer
      .getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isTouchDevice = !this.appConfig.clickDropdownHeader;
        this.theme.applyServerDefault();

        this.setTitle(this.translate.instant('SmartHomeNG'));

        const credentials = { username: '', password: '' };
        this.log.log('signIn', { credentials });
        this.authService
          .login(credentials)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((result: boolean) => {
            this.log.log('Anonymous login:', { result });
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
    });

    // Sync loggedIn / loginRequired whenever auth state changes.
    // Only rebuild the menu if translations are already loaded; if not,
    // onLangChange will call buildMenu() once they arrive.
    this.authService.loggedIn$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loggedIn) => {
      this.loggedIn.set(loggedIn);
      this.loginRequired.set(this.authService.loginRequired());
      if (this.translate.currentLang) {
        this.buildMenu();
      }
    });

    // Keep the toggle's own icon/label in sync — ThemeService can be changed
    // from applyServerDefault() above (async, after this component's own
    // click-triggered checks have already run) or, in principle, from
    // elsewhere entirely. Uses detectChanges() rather than markForCheck():
    // this fires from deep inside the getServerinfo()/login() async chain,
    // where relying on some later ambient zone tick to actually flush the
    // dirty flag is not reliable — verified live that the icon can stay
    // stale (still showing the old theme) after markForCheck() alone here,
    // even though the DOM's dark-mode class and ThemeService's own state
    // are already correct at that point.
    this.theme.darkMode$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cdr.detectChanges();
    });

    this.log.log('TopNavigationComponent.ngOnInit() leaving');
  }

  // Label of the section whose dropdown is currently forced open (touch mode).
  openMenuLabel: string | null = null;

  // Side-drawer state (mobile ≤720px)
  drawerOpen = false;
  drawerOpenSections = new Set<string>();

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
    if (this.drawerOpen) {
      // Pre-expand the section whose child route is currently active
      const url = this.router.url;
      for (const entry of this.menu()) {
        if (entry.items.some((sub) => sub.routerLink && url.startsWith(sub.routerLink[0]))) {
          this.drawerOpenSections.add(entry.label);
          break;
        }
      }
    } else {
      this.drawerOpenSections.clear();
    }
  }

  closeDrawer() {
    this.drawerOpen = false;
    this.drawerOpenSections.clear();
  }

  toggleDrawerSection(label: string) {
    const wasOpen = this.drawerOpenSections.has(label);
    this.drawerOpenSections.clear();
    if (!wasOpen) {
      this.drawerOpenSections.add(label);
    }
  }

  enableDropdownMenu() {
    this.el.nativeElement.querySelectorAll('.dropdown-content-hidden').forEach((x: Element) => {
      this.renderer.removeClass(x, 'dropdown-content-hidden');
      this.renderer.addClass(x, 'dropdown-content');
    });
  }

  disableResponsiveMenu(menuEntry: MenuItem, hideDropdown = true) {
    this.closeTouchDropdown();

    const m = this.topnavEl()?.nativeElement;
    if (!m) return;

    this.renderer.removeClass(m, 'responsive');

    if (hideDropdown) {
      const x: Element | null = this.el.nativeElement.querySelector('#menu-' + menuEntry.label);
      if (!x) return;
      this.renderer.removeClass(x, 'dropdown-content');
      this.renderer.addClass(x, 'dropdown-content-hidden');
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
        const el: Element | null = this.el.nativeElement.querySelector('#menu-' + menuEntry.label);
        if (el) this.renderer.addClass(el, 'dropdown-touch-open');
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
    this.el.nativeElement
      .querySelectorAll('.dropdown-touch-open')
      .forEach((x: Element) => this.renderer.removeClass(x, 'dropdown-touch-open'));
    this.openMenuLabel = null;
  }

  private static setMenuEntry(
    menu: MenuItem[],
    index: number,
    label: string,
    routerLink: string[] = [],
    visible: boolean = true,
  ) {
    while (menu.length < index + 1) {
      menu.push({ label: 'dummy', visible: visible, items: [] });
    }
    menu[index].label = label;
    menu[index].routerLink = routerLink;
    menu[index].visible = visible;
  }

  private static setSubmenuEntry(
    menu: MenuItem[],
    index: number,
    submenu: number,
    label: string,
    routerLink: string[],
  ) {
    while (menu[index].items.length < submenu + 1) {
      menu[index].items.push({ label: 'dummy' });
    }
    menu[index].items[submenu].label = label;
    menu[index].items[submenu].routerLink = routerLink;
  }

  buildMenu() {
    this.log.log('TopNavigationComponent.buildMenu entering');
    this.log.log(
      'TopNavigationComponent.buildMenu: default_language=',
      this.appConfig.defaultLanguage,
    );

    const menu: MenuItem[] = [];
    TopNavigationComponent.setMenuEntry(menu, 0, this.translate.instant('MENU.DASHBOARD'), [
      '/dashboard',
    ]);

    TopNavigationComponent.setMenuEntry(menu, 1, this.translate.instant('MENU.SYSTEM'), [
      '/system/systemproperties',
    ]);
    TopNavigationComponent.setSubmenuEntry(
      menu,
      1,
      0,
      this.translate.instant('MENU.SYSTEM_PROPERTIES'),
      ['/system/systemproperties'],
    );
    TopNavigationComponent.setSubmenuEntry(
      menu,
      1,
      1,
      this.translate.instant('MENU.SYSTEM_CONFIGURATION'),
      ['/system/config'],
    );

    TopNavigationComponent.setMenuEntry(menu, 2, this.translate.instant('MENU.SERVICES'), [
      '/services',
    ]);
    TopNavigationComponent.setSubmenuEntry(menu, 2, 0, this.translate.instant('MENU.SERVICES'), [
      '/services',
    ]);
    TopNavigationComponent.setSubmenuEntry(
      menu,
      2,
      1,
      this.translate.instant('MENU.FUNCTION_CONFIGURATION'),
      ['/services/functions'],
    );

    TopNavigationComponent.setMenuEntry(menu, 3, this.translate.instant('MENU.ITEMS'), ['/items']);
    TopNavigationComponent.setSubmenuEntry(menu, 3, 0, this.translate.instant('MENU.ITEM_TREE'), [
      '/items',
    ]);
    TopNavigationComponent.setSubmenuEntry(
      menu,
      3,
      1,
      this.translate.instant('MENU.ITEM_CONFIGURATION'),
      ['/items/config'],
    );
    TopNavigationComponent.setSubmenuEntry(
      menu,
      3,
      2,
      this.translate.instant('MENU.ITEM_STRUCTS'),
      ['/items/structs'],
    );
    TopNavigationComponent.setSubmenuEntry(
      menu,
      3,
      3,
      this.translate.instant('MENU.ITEM_STRUCT_CONFIGURATION'),
      ['/items/struct_config'],
    );

    TopNavigationComponent.setMenuEntry(menu, 4, this.translate.instant('MENU.LOGICS'), [
      '/logics/list',
    ]);
    TopNavigationComponent.setSubmenuEntry(menu, 4, 0, this.translate.instant('MENU.LOGICS_LIST'), [
      '/logics/list',
    ]);
    TopNavigationComponent.setSubmenuEntry(
      menu,
      4,
      1,
      this.translate.instant('MENU.LOGICS_GROUPS'),
      ['/logics/groups'],
    );

    TopNavigationComponent.setMenuEntry(menu, 5, this.translate.instant('MENU.PLUGINS'), [
      '/plugins',
    ]);
    TopNavigationComponent.setSubmenuEntry(
      menu,
      5,
      0,
      this.translate.instant('MENU.PLUGINS_LIST'),
      ['/plugins'],
    );
    TopNavigationComponent.setSubmenuEntry(
      menu,
      5,
      1,
      this.translate.instant('MENU.PLUGINS_CONFIGURATION'),
      ['/plugins/config'],
    );

    TopNavigationComponent.setMenuEntry(menu, 6, this.translate.instant('MENU.SCENES'), [
      '/scenes/list',
    ]);
    TopNavigationComponent.setSubmenuEntry(menu, 6, 0, this.translate.instant('MENU.SCENE_LIST'), [
      '/scenes/list',
    ]);
    TopNavigationComponent.setSubmenuEntry(
      menu,
      6,
      1,
      this.translate.instant('MENU.SCENE_CONFIGURATION'),
      ['/scenes/config'],
    );

    TopNavigationComponent.setMenuEntry(menu, 7, this.translate.instant('MENU.SCHEDULERS'), [
      '/schedulers',
    ]);
    TopNavigationComponent.setSubmenuEntry(menu, 7, 0, this.translate.instant('MENU.SCHEDULERS'), [
      '/schedulers',
    ]);
    TopNavigationComponent.setSubmenuEntry(menu, 7, 1, this.translate.instant('MENU.THREADS'), [
      '/threads',
    ]);

    TopNavigationComponent.setMenuEntry(menu, 8, this.translate.instant('MENU.LOGS'), [
      '/logs/display',
    ]);
    TopNavigationComponent.setSubmenuEntry(
      menu,
      8,
      0,
      this.translate.instant('MENU.LOGS_DISPLAY'),
      ['/logs/display'],
    );
    TopNavigationComponent.setSubmenuEntry(
      menu,
      8,
      1,
      this.translate.instant('MENU.LOGGER_CONFIGURATION'),
      ['/logs/logger-list'],
    );
    TopNavigationComponent.setSubmenuEntry(
      menu,
      8,
      2,
      this.translate.instant('MENU.LOGGING_CONFIGURATION'),
      ['/logs/logging-configuration'],
    );
    this.menu.set(menu);
    this.log.log('TopNavigationComponent.buildMenu leaving');
  }

  logout() {
    if (this.loggedIn() && this.loginRequired()) {
      this.router.navigate(['/login']);
      this.authService.logout();
    }
  }

  get helpLocalAvailable(): boolean {
    return this.appConfig.helpLocalAvailable;
  }

  // The develop-branch docs are only relevant if the running instance is
  // actually on unreleased code — independent of developer mode, which
  // just controls exposure of advanced/riskier UI controls.
  get nonMasterBranch(): boolean {
    return this.appConfig.coreBranch !== 'master' || this.appConfig.pluginsBranch !== 'master';
  }

  private get helpPage(): string {
    const segment = this.currentUrl().split('/')[1];
    return HELP_PAGE_BY_ROUTE[segment] ?? 'admin';
  }

  get helpUrlOfficial(): string {
    return `https://smarthomeng.github.io/smarthome/admin/${this.helpPage}.html`;
  }

  get helpUrlLocal(): string {
    return new URL(`help/admin/${this.helpPage}.html`, document.baseURI).toString();
  }

  get helpUrlDev(): string {
    return `https://smarthomeng.github.io/dev_doc/admin/${this.helpPage}.html`;
  }

  get helpUrl(): string {
    return this.helpLocalAvailable ? this.helpUrlLocal : this.helpUrlOfficial;
  }
}

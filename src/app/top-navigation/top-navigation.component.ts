
import {Component, OnInit, DoCheck, SimpleChanges, HostListener} from '@angular/core';
import {AppConfigService} from '../common/services/app-config.service';
import {TranslateService} from '@ngx-translate/core';
import {AppComponent} from '../app.component';
import {ServerApiService} from '../common/services/server-api.service';
import {Router} from '@angular/router';
import {AuthService} from '../common/services/auth.service';
//import { HttpClient } from '@angular/common/http';
import {SharedService} from '../common/services/shared.service';
import {Title} from '@angular/platform-browser';

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
  styleUrls: ['./top-navigation.component.css']
})


export class TopNavigationComponent implements OnInit {

  labels: string[] = [];
  menu: MenuItem[] = [];
  loggedIn = false;

  developerMode = false;
  lastLanguage : string = '-';
  isTouchDevice = false;


  constructor(private appComponent: AppComponent,
              private translate: TranslateService,
              public  shared: SharedService,
              private dataServiceServer: ServerApiService,
              protected router: Router,
              public authService: AuthService,
              private titleService: Title,
              private appConfig: AppConfigService) {

    console.log('TopNavigationComponent - constructor()');
  }


  ngDoCheck() {
    if (!(this.lastLanguage === this.appConfig.defaultLanguage)) {
      this.buildMenu();
      this.lastLanguage = this.appConfig.defaultLanguage;
    }
    this.loggedIn = this.authService.isLoggedIn();
    console.log('TopNavigationComponent.ngDoCheck() this.loggedIn=', this.loggedIn );
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }
  ngOnInit() {
    console.log('TopNavigationComponent.ngOnInit() entered');

    this.dataServiceServer!.getServerinfo()
      .subscribe(
        (response) => {
          this.developerMode = (this.appConfig.developerMode);
          this.isTouchDevice = (!this.appConfig.clickDropdownHeader);
          console.log('TopNavigationComponent.ngOnInit: getLangs()', this.translate.getLangs());
          console.log('TopNavigationComponent.ngOnInit: getDefaultLang()', this.translate.getDefaultLang());
          this.translate.use(this.appConfig.defaultLanguage);
          this.translate.setDefaultLang(this.appConfig.defaultLanguage);
          // this.lastLanguage = this.appConfig.defaultLanguage;

          this.translate.use('de');
          this.translate.setDefaultLang('de');
          this.shared.setGuiLanguage();
          console.log('TopNavigationComponent.ngOnInit: getDefaultLang() =', this.translate.getDefaultLang());

          this.buildMenu();

          this.setTitle(this.translate.instant('SmartHomeNG'));

          const credentials = {'username': '', 'password': ''};
          console.log('signIn', {credentials});
          this.authService.login(credentials)
            .subscribe((result: boolean) => {
              console.log('Anonymous login:', {result});
              this.buildMenu();
            });

        }
      );
    console.log('TopNavigationComponent.ngOnInit() leaving');
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

  setMenuEntry(menu: number, label: string, routerLink: string[] = [], visible: boolean = true) {
    while (this.menu.length < menu + 1) {
      this.menu.push({label: 'dummy', visible: visible, items: []});
    }
    this.menu[menu].label = label;
    this.menu[menu].routerLink = routerLink;
    this.menu[menu].visible = visible;
  }

  setSubmenuEntry(menu: number, submenu: number, label: string, routerLink: string[]) {
    while (this.menu[menu].items.length < submenu + 1) {
      this.menu[menu].items.push({label: 'dummy'});
    }
    this.menu[menu].items[submenu].label = label;
    this.menu[menu].items[submenu].routerLink = routerLink;
  }

  buildMenu() {
    console.log('TopNavigationComponent.buildMenu entering');
    console.log('TopNavigationComponent.buildMenu: default_language=', this.appConfig.defaultLanguage);

    this.setMenuEntry(0, this.translate.instant('MENU.SYSTEM'), ['/system/systemproperties']);
    this.setSubmenuEntry(0, 0, this.translate.instant('MENU.SYSTEM_PROPERTIES'), ['/system/systemproperties']);
    this.setSubmenuEntry(0, 1, this.translate.instant('MENU.SYSTEM_CONFIGURATION'), ['/system/config']);

    this.setMenuEntry(1, this.translate.instant('MENU.SERVICES'), ['/services']);
    this.setSubmenuEntry(1, 0, this.translate.instant('MENU.SERVICES'), ['/services']);
    this.setSubmenuEntry(1, 1, this.translate.instant('MENU.FUNCTION_CONFIGURATION'), ['/services/functions']);

    // this.setMenuEntry(2, this.translate.instant('MENU.ITEMS'));
    this.setMenuEntry(2, this.translate.instant('MENU.ITEMS'), ['/item_tree']);
    this.setSubmenuEntry(2, 0, this.translate.instant('MENU.ITEM_TREE'), ['/item_tree']);
    this.setSubmenuEntry(2, 1, this.translate.instant('MENU.ITEM_CONFIGURATION'), ['/items/config']);
    if (this.developerMode === true && false) {
      this.setSubmenuEntry(2, 2, this.translate.instant('MENU.ITEM_CONFIGURATION') + ' (dev)', ['/items/config2']);
      this.setSubmenuEntry(2, 3, this.translate.instant('MENU.ITEM_STRUCTS'), ['/items/structs']);
      this.setSubmenuEntry(2, 4, this.translate.instant('MENU.ITEM_STRUCT_CONFIGURATION'), ['/items/struct_config']);
    } else {
      this.setSubmenuEntry(2, 2, this.translate.instant('MENU.ITEM_STRUCTS'), ['/items/structs']);
      this.setSubmenuEntry(2, 3, this.translate.instant('MENU.ITEM_STRUCT_CONFIGURATION'), ['/items/struct_config']);
    }

    this.setMenuEntry(3, this.translate.instant('MENU.LOGICS'), ['/logics-list']);
    this.setSubmenuEntry(3, 0, this.translate.instant('MENU.LOGICS_LIST'), ['/logics-list']);
    this.setSubmenuEntry(3, 1, this.translate.instant('MENU.LOGICS_GROUPS'), ['/logics-groups']);

    this.setMenuEntry(4, this.translate.instant('MENU.PLUGINS'), ['/plugins_list']);
    this.setSubmenuEntry(4, 0, this.translate.instant('MENU.PLUGINS_LIST'), ['/plugins_list']);
    this.setSubmenuEntry(4, 1, this.translate.instant('MENU.PLUGINS_CONFIGURATION'), ['/plugins/config']);

    this.setMenuEntry(5, this.translate.instant('MENU.SCENES'), ['/scenes/list']);
    this.setSubmenuEntry(5, 0, this.translate.instant('MENU.SCENE_LIST'), ['/scenes/list']);
    this.setSubmenuEntry(5, 1, this.translate.instant('MENU.SCENE_CONFIGURATION'), ['/scenes/config']);

    this.setMenuEntry(6, this.translate.instant('MENU.SCHEDULERS'), ['/schedulers']);
    this.setSubmenuEntry(6, 0, this.translate.instant('MENU.SCHEDULERS'), ['/schedulers']);
    this.setSubmenuEntry(6, 1, this.translate.instant('MENU.THREADS'), ['/threads']);

    this.setMenuEntry(7, this.translate.instant('MENU.LOGS'), ['/logs/display']);
    this.setSubmenuEntry(7, 0, this.translate.instant('MENU.LOGS_DISPLAY'), ['/logs/display']);
    this.setSubmenuEntry(7, 1, this.translate.instant('MENU.LOGGER_CONFIGURATION'), ['/logs/logger-list']);
    this.setSubmenuEntry(7, 2, this.translate.instant('MENU.LOGGING_CONFIGURATION'), ['/logs/logging-configuration']);
    console.log('TopNavigationComponent.buildMenu leaving');
  }

  logout() {
    if (this.authService.isLoggedIn() && this.authService.loginRequired()) {
      this.router.navigate(['/login']);
      this.authService.logout();
    }
  }
}

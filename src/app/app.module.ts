import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { Injector } from '@angular/core';
//newly integrated
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { TranslateService } from '@ngx-translate/core';

import { TabsModule } from 'ngx-bootstrap/tabs';
import { AlertModule } from 'ngx-bootstrap/alert';
import { ModalModule } from 'ngx-bootstrap/modal';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

// UI from primeng
import { TreeModule } from 'primeng/tree';
import { TableModule } from 'primeng/table';
import { TreeTableModule } from 'primeng/treetable';
import { AccordionModule } from 'primeng/accordion';        // deprecated --> AccordionHeader and AccordionContent components
import { TooltipModule } from 'primeng/tooltip';
import { MenubarModule } from 'primeng/menubar';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { Select } from 'primeng/select';          // DropdownModule was deprecated in primeng 18 --> Select
import { ChartModule } from 'primeng/chart';
// deprecated --> ToggleSwitch
//import { InputSwitchModule } from 'primeng/inputswitch';    // deprecated --> ToggleSwitch
import { TabViewModule } from 'primeng/tabview';            //
import { ProgressSpinnerModule } from 'primeng/progressspinner';
//import { CheckboxModule } from 'primeng/checkbox';
import { Checkbox } from 'primeng/checkbox';
// import { TriStateCheckboxModule } from 'primeng/tristatecheckbox'; // removed in primeng v18, use Checkbox with indeterminate option
import { ListboxModule } from 'primeng/listbox';
import { FileUploadModule } from 'primeng/fileupload';

import { AppComponent } from './app.component';
import { HttpLoaderFactory } from './app.component';
import { SystemComponent } from './system/system-overview/system.component';
import { ServicesComponent } from './services/services.component';
import { ItemTreeComponent } from './items/item-tree/item-tree.component';
import { LogicsListComponent } from './logics/logics-list/logics-list.component';
import { SchedulersComponent } from './schedulers/schedulers/schedulers.component';
import { PluginsComponent } from './plugins/plugin-list/plugins.component';
import { ScenesComponent } from './scenes/scene-list/scenes.component';
import { ThreadsComponent } from './schedulers/threads/threads.component';
import { LogDisplayComponent } from './logs/log-display/log-display.component';
import { HeaderComponent } from './header/header.component';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing-module';
import { PluginConfigComponent } from './plugins/config/plugin-config.component';
import { OlddataService } from './common/services/olddata.service';
import { WebsocketPluginService } from './common/services/websocket-plugin.service';
import { LoggerListComponent } from './logs/logger-list/logger-list.component';
import { LoggingConfigurationComponent } from './logs/logging-configuration/logging-configuration.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { LoginComponent } from './login/login.component';
import { NoAccessComponent } from './no-access/no-access.component';
import { AuthService } from './common/services/auth.service';
import { JwtModule, JWT_OPTIONS } from '@auth0/angular-jwt';
import { SystemConfigComponent } from './system/system-config/system-config.component';
import { StructsComponent } from './items/structs/structs.component';
import { ItemConfigurationComponent } from './items/item-configuration/item-configuration.component';
import { ItemConfiguration2Component } from './items/item-configuration2/item-configuration2.component';
import { StructConfigurationComponent } from './items/struct-configuration/struct-configuration.component';
import { SceneConfigurationComponent } from './scenes/scene-configuration/scene-configuration.component';
import { FunctionConfigurationComponent } from './services/function-configuration/function-configuration.component';
import { LogicsEditComponent } from './logics/logics-edit/logics-edit.component';
import { TopNavigationComponent } from './top-navigation/top-navigation.component';
import { LoggerLineComponent } from './logs/logger-line/logger-line.component';
import { LoggerTabComponent } from './logs/logger-tab/logger-tab.component';
import { LogicsGroupsComponent } from './logics/logics-groups/logics-groups.component';

export function translateHttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

@NgModule({ declarations: [
        AppComponent,
        SystemComponent,
        ServicesComponent,
        ItemTreeComponent,
        LogicsListComponent,
        SchedulersComponent,
        PluginsComponent,
        ScenesComponent,
        ThreadsComponent,
        LogDisplayComponent,
        HeaderComponent,
        PluginConfigComponent,
        LoggerListComponent,
        LoggingConfigurationComponent,
        NotFoundComponent,
        LoginComponent,
        NoAccessComponent,
        SystemConfigComponent,
        StructsComponent,
        ItemConfigurationComponent,
        ItemConfiguration2Component,
        StructConfigurationComponent,
        SceneConfigurationComponent,
        FunctionConfigurationComponent,
        LogicsEditComponent,
        TopNavigationComponent,
        LoggerLineComponent,
        LoggerTabComponent,
        LogicsGroupsComponent
    ],
    bootstrap: [AppComponent], 
    imports: [BrowserModule,
        FormsModule,
        AppRoutingModule,
        // RouterModule.forRoot([]),
        // Jwt Token Injection
        JwtModule.forRoot({
            config: {
                throwNoTokenError: false
            },
            jwtOptionsProvider: {
                provide: JWT_OPTIONS,
                useFactory: jwtOptionsFactory,
                deps: [Injector]                // deps: [AuthService]
            }
        }),
        BrowserAnimationsModule,
        CodemirrorModule,
        //    NgxRerenderModule,
        TreeModule,
        TableModule,
        TreeTableModule,
        AccordionModule,
        TooltipModule,
        MenubarModule,
        Dialog,
        ButtonModule,
        InputTextModule,
        ToggleButtonModule,
        // DropdownModule was deprecated in primeng 18, --> Select
        Select,
        ChartModule,
        // deprecated: InputSwitchModule,  --> // deprecated --> ToggleSwitch
        TabViewModule,
        // TriStateCheckboxModule was deprecated in primeng 18, --> Use Checkbox with indeterminate option
        Checkbox,
        ProgressSpinnerModule,
        //CheckboxModule,
        Checkbox,
        ListboxModule,
        FileUploadModule,
        TabsModule.forRoot(),
        AlertModule.forRoot(),
        ModalModule.forRoot(),
        FontAwesomeModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        })
        //        useFactory: translateHttpLoaderFactory,
    ], providers: [
        { provide: 'BASE_URL', useFactory: getBaseUrl },
        OlddataService,
        WebsocketPluginService,
        TranslateService,
        JwtModule,
        provideHttpClient(withInterceptorsFromDi())
    ] })


export class AppModule { }

export function getBaseUrl() {
  return document.getElementsByTagName('base')[0].href;
}

// export function jwtOptionsFactory(authService) {
//   return {
//     tokenGetter: () => {
//       if (authService !== undefined) {
//         return authService.getToken();
//       }
//       return '';
//     },
//   };
// }

export function jwtOptionsFactory(injector: Injector) {
  return {
    tokenGetter: () => {
      const authService = injector.get(AuthService);
      return authService.getToken();
    }
  };
}

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../testing/test-helpers';
import { AppConfigService } from '../common/services/app-config.service';
import { AuthService } from '../common/services/auth.service';
import { ServerApiService } from '../common/services/server-api.service';
import { TopNavigationComponent } from './top-navigation.component';

@Component({ template: '', standalone: true })
class BlankTestComponent {}

describe('TopNavigationComponent', () => {
  let component: TopNavigationComponent;
  let fixture: ComponentFixture<TopNavigationComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    const mockAuth = {
      ...createMockAuthService(),
      login: jest.fn().mockReturnValue(of(false)),
    };

    await TestBed.configureTestingModule({
      imports: [TopNavigationComponent, translateTestingModule],
      providers: [
        provideRouter([{ path: '**', component: BlankTestComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TopNavigationComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TopNavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loggedIn is initially false', () => {
    expect(component.loggedIn).toBe(false);
  });

  it('helpUrl falls back to the official docs when local docs are unavailable', () => {
    expect(component.helpUrl).toBe(component.helpUrlOfficial);
    expect(component.helpUrlOfficial).toContain('smarthomeng.github.io/smarthome/admin/');
  });

  it('helpUrl points to the section-specific admin doc page for the current route', () => {
    jest.spyOn(component.router, 'url', 'get').mockReturnValue('/items');
    expect(component.helpUrlOfficial).toContain('/admin/items.html');
  });

  it('helpUrl falls back to the generic admin page for unmapped routes', () => {
    jest.spyOn(component.router, 'url', 'get').mockReturnValue('/login');
    expect(component.helpUrlOfficial).toContain('/admin/admin.html');
  });

  it('helpUrlDev points to the same section page on the develop-branch docs mirror', () => {
    jest.spyOn(component.router, 'url', 'get').mockReturnValue('/plugins');
    expect(component.helpUrlDev).toBe('https://smarthomeng.github.io/dev_doc/admin/plugins.html');
  });

  it('nonMasterBranch is false when both core and plugins are on master', () => {
    expect(component.nonMasterBranch).toBe(false);
  });

  it('nonMasterBranch is true when core is on a non-master branch', () => {
    component['appConfig'].coreBranch = 'edit-item';
    expect(component.nonMasterBranch).toBe(true);
  });

  it('nonMasterBranch is true when plugins is on a non-master branch', () => {
    component['appConfig'].pluginsBranch = 'edit-item';
    expect(component.nonMasterBranch).toBe(true);
  });

  it('marks the component for check on navigation, so the OnPush Help link stays current', async () => {
    const markForCheck = jest.spyOn(component['cdr'], 'markForCheck');
    await TestBed.inject(Router).navigateByUrl('/items');
    expect(markForCheck).toHaveBeenCalled();
  });
});

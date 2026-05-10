import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { ServerApiService } from './common/services/server-api.service';
import { AuthService } from './common/services/auth.service';
import { AppConfigService } from './common/services/app-config.service';
import { TranslatePipe } from '@ngx-translate/core';
import {translateTestingModule, 
  createMockAuthService,
  createMockAppConfigService} from '../testing/test-helpers';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        translateTestingModule,
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: 'BASE_URL', useValue: 'http://localhost/' },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(AppComponent, { set: { imports: [TranslatePipe] } })
    .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('APP_NAME is shngAdmin', () => {
    expect(component.APP_NAME).toBe('shngAdmin');
  });

  it('title is shngadmin', () => {
    expect(component.title).toBe('shngadmin');
  });
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockServerApiService,
  translateTestingModule,
} from '../../testing/test-helpers';
import { AppConfigService } from '../common/services/app-config.service';
import { ServerApiService } from '../common/services/server-api.service';
import { AuthService } from './../common/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    const mockAuthService = {
      isLoggedIn: () => false,
      loginRequired: () => true,
      loggedIn$: { subscribe: () => {} },
      logout: jest.fn(),
      login: jest.fn().mockReturnValue(of(false)),
      getToken: () => null,
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: createMockServerApiService() },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LoginComponent, {
        set: { imports: [TranslatePipe, FormsModule], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('invalidLogin is initially falsy', () => {
    expect(component.invalidLogin).toBeFalsy();
  });
});

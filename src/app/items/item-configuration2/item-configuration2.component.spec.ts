import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { ItemConfiguration2Component } from './item-configuration2.component';

describe('ItemConfiguration2Component', () => {
  let component: ItemConfiguration2Component;
  let fixture: ComponentFixture<ItemConfiguration2Component>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [ItemConfiguration2Component, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ItemConfiguration2Component, { set: { imports: [TranslatePipe] } })
      .compileComponents();

    fixture = TestBed.createComponent(ItemConfiguration2Component);
    component = fixture.componentInstance;
    (component as any).codeEditor = {
      codeMirror: {
        getOption: jest.fn(() => false),
        setSize: jest.fn(),
        refresh: jest.fn(),
        state: { completionActive: false },
      },
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

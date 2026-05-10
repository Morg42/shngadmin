import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { LogicsListComponent } from './logics-list.component';
import { ServerApiService } from '../../common/services/server-api.service';
import { AuthService } from '../../common/services/auth.service';
import { AppConfigService } from '../../common/services/app-config.service';
import { TranslatePipe } from '@ngx-translate/core';
import {translateTestingModule, 
  createMockAuthService,
  createMockAppConfigService} from '../../../testing/test-helpers';

describe('LogicsListComponent', () => {
  let component: LogicsListComponent;
  let fixture: ComponentFixture<LogicsListComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [
        LogicsListComponent,
        translateTestingModule,
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
            params: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(LogicsListComponent, { set: { imports: [TranslatePipe] } })
    .compileComponents();

    fixture = TestBed.createComponent(LogicsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/logics/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { LogicsApiService } from '../../common/services/logics-api.service';
import { LogicsListComponent } from './logics-list.component';

describe('LogicsListComponent', () => {
  let component: LogicsListComponent;
  let fixture: ComponentFixture<LogicsListComponent>;

  const userLogicsCount = fixtureData.logics.filter((l) => l.userlogic === true).length;
  const systemLogicsCount = fixtureData.logics.filter((l) => !l.userlogic).length;

  const mockLogicsApi = {
    getLogics: () => of(fixtureData),
    setLogicState: () => of({}),
    groupExpanded: [] as number[],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogicsListComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: {}, queryParams: {} },
            queryParams: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LogicsListComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LogicsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load total logics count from fixture', () => {
    expect(component.logics.length).toBe(fixtureData.logics.length);
  });

  it('should separate user logics from system logics', () => {
    expect(component.userlogics.length).toBe(userLogicsCount);
    expect(component.systemlogics.length).toBe(systemLogicsCount);
  });

  it('should load new logics from fixture', () => {
    expect(component.newlogics.length).toBe(fixtureData.logics_new.length);
  });

  it('should build a groupList with at least one group from fixture', () => {
    // fixture has logics with groups: the groupList should be non-empty
    expect(component.groupList.length).toBeGreaterThan(0);
  });
});

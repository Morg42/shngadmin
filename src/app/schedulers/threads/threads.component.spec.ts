import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/threads/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ThreadsApiService } from '../../common/services/threads-api.service';
import { ThreadsComponent } from './threads.component';

describe('ThreadsComponent', () => {
  let component: ThreadsComponent;
  let fixture: ComponentFixture<ThreadsComponent>;

  // fixture is [count, ThreadInfo[]]
  const threadCount: number = fixtureData[0] as unknown as number;
  const threadList: any[] = fixtureData[1] as unknown as any[];

  const mockThreadsApi = {
    getThreads: () => of(fixtureData),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreadsComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ThreadsApiService, useValue: mockThreadsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ThreadsComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ThreadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate threads_count from fixture[0]', () => {
    expect(component.threads_count).toBe(threadCount);
  });

  it('should populate threadsList with fixture[1] array', () => {
    expect(component.threadsList.length).toBe(threadList.length);
  });

  it('should render one tbody row per thread in fixture', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(threadList.length);
  });

  it('should display the first thread name in the first row first cell', () => {
    const firstRow = fixture.nativeElement.querySelector('tbody tr');
    expect(firstRow).toBeTruthy();
    const firstCell = firstRow.querySelector('td');
    expect(firstCell.textContent.trim()).toBe(threadList[0].name);
  });
});

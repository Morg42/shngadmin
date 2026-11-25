import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/threads/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { CancelOutcome } from '../../common/models/thread-info';
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

  const taskDetails = {
    id: 139628436793088,
    task: threadList.find((t) => t.name === 'logics.slow').task,
    stack: ['  File "/etc/logics/slow.py", line 3, in <module>\n    time.sleep(600)\n'],
  };

  const mockThreadsApi = {
    getThreads: jest.fn(() => of(fixtureData)),
    getThreadTask: jest.fn((_ident: number) => of(taskDetails as typeof taskDetails | null)),
    cancelThreadTask: jest.fn((_ident: number, _taskId: number) => of<CancelOutcome>('requested')),
  };

  const rowOf = (name: string): HTMLTableRowElement =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>,
    ).find((row) => row.querySelector('td')?.textContent?.trim() === name)!;

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
        MessageService,
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
    expect(component.threads_count()).toBe(threadCount);
  });

  it('should populate threadsList with fixture[1] array', () => {
    expect(component.threadsList().length).toBe(threadList.length);
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

  it('should sort by name ascending, then descending on second click', () => {
    component.sortBy('name');
    const ascending = component.threadsList().map((t) => t.name.toLowerCase());
    expect(ascending).toEqual([...ascending].sort());

    component.sortBy('name');
    const descending = component.threadsList().map((t) => t.name.toLowerCase());
    expect(descending).toEqual([...ascending].reverse());
  });

  it('should not mutate the unsorted list when sorting', () => {
    const before = component.threadsList();
    component.sortBy('name');
    component.sortField.set('');
    expect(component.threadsList()).toEqual(before);
  });

  describe('running scheduler tasks', () => {
    it('shows task type and runtime for threads running a task', () => {
      const cells = rowOf('logics.slow').querySelectorAll('td');
      expect(cells[1].textContent.trim()).toBe('logic');
      expect(cells[2].querySelector('.task-runtime').textContent.trim()).toBe('3 min 7 s');
      expect(rowOf('plugins.foo.poll').querySelector('.task-runtime')!.textContent!.trim()).toBe(
        '2.3 s',
      );
    });

    it('leaves type and runtime empty for threads without a task', () => {
      const cells = rowOf('Main').querySelectorAll('td');
      expect(cells[1].textContent.trim()).toBe('');
      expect(cells[2].textContent.trim()).toBe('');
    });

    it('marks the runtime of overdue tasks only as warning status', () => {
      const runtimeOf = (name: string) => rowOf(name).querySelector('.task-runtime')!.classList;
      expect(runtimeOf('logics.slow')).toContain('shng-status-warning');
      expect(runtimeOf('plugins.foo.poll')).not.toContain('shng-status-warning');
    });

    it('offers a stack button only for threads running a task', () => {
      expect(rowOf('logics.slow').querySelector('.stack-button')).toBeTruthy();
      expect(rowOf('Main').querySelector('.stack-button')).toBeNull();
    });

    it('loads and shows the stack of a task when its stack button is clicked', () => {
      rowOf('logics.slow').querySelector<HTMLButtonElement>('.stack-button')!.click();

      expect(mockThreadsApi.getThreadTask).toHaveBeenCalledWith(139628436793088);
      expect(component.stackVisible()).toBe(true);
      expect(component.stackText()).toContain('time.sleep(600)');
    });

    it('reports a task that finished before its stack could be loaded', () => {
      mockThreadsApi.getThreadTask.mockReturnValueOnce(of(null));

      rowOf('logics.slow').querySelector<HTMLButtonElement>('.stack-button')!.click();

      expect(component.stackVisible()).toBe(true);
      expect(component.stackText()).toBe('');
      expect(component.stackTaskFinished()).toBe(true);
    });
  });

  describe('cancelling a logic', () => {
    const clickCancel = (name: string) =>
      rowOf(name).querySelector<HTMLButtonElement>('.cancel-button')!.click();

    beforeEach(() => {
      mockThreadsApi.cancelThreadTask.mockClear();
      mockThreadsApi.getThreads.mockClear();
      jest.spyOn(TestBed.inject(MessageService), 'add');
    });

    it('offers a cancel button only for cancellable tasks', () => {
      expect(rowOf('logics.slow').querySelector('.cancel-button')).toBeTruthy();
      expect(rowOf('plugins.foo.poll').querySelector('.cancel-button')).toBeNull();
      expect(rowOf('Main').querySelector('.cancel-button')).toBeNull();
    });

    it('asks for confirmation before cancelling', () => {
      clickCancel('logics.slow');

      expect(component.cancelTarget()).toEqual({
        ident: 139628436793088,
        taskId: 17,
        name: 'logics.slow',
      });
      expect(mockThreadsApi.cancelThreadTask).not.toHaveBeenCalled();
    });

    it('drops the request when the confirmation is aborted', () => {
      clickCancel('logics.slow');
      component.abortCancel();

      expect(component.cancelTarget()).toBeNull();
      expect(mockThreadsApi.cancelThreadTask).not.toHaveBeenCalled();
    });

    it('requests cancellation of the task run on confirm, reports it and reloads the list', () => {
      clickCancel('logics.slow');
      component.confirmCancel();

      expect(mockThreadsApi.cancelThreadTask).toHaveBeenCalledWith(139628436793088, 17);
      expect(TestBed.inject(MessageService).add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success', detail: 'logics.slow' }),
      );
      expect(mockThreadsApi.getThreads).toHaveBeenCalledTimes(1);
      expect(component.cancelTarget()).toBeNull();
    });

    it('reports a task that finished before the request as info', () => {
      mockThreadsApi.cancelThreadTask.mockReturnValueOnce(of('not_found'));

      clickCancel('logics.slow');
      component.confirmCancel();

      expect(TestBed.inject(MessageService).add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'info' }),
      );
    });

    it('reports a failed request as error', () => {
      mockThreadsApi.cancelThreadTask.mockReturnValueOnce(of('error'));

      clickCancel('logics.slow');
      component.confirmCancel();

      expect(TestBed.inject(MessageService).add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });

    it('shows a pending cancellation with its request count', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('test', { THREADS: { CANCEL_PENDING: 'requested ×{{count}}' } });
      translate.use('test');
      fixture.detectChanges();

      const state = rowOf('logics.slow').querySelector('.cancel-state');
      expect(state!.textContent!.trim()).toBe('requested ×2');
      expect(rowOf('plugins.foo.poll').querySelector('.cancel-state')).toBeNull();
    });

    it('offers cancelling from the stack dialog', () => {
      rowOf('logics.slow').querySelector<HTMLButtonElement>('.stack-button')!.click();

      component.askCancelFromStack();

      expect(component.cancelTarget()).toEqual({
        ident: 139628436793088,
        taskId: 17,
        name: 'logics.slow',
      });
    });
  });

  it('reloads the thread list on reload()', () => {
    mockThreadsApi.getThreads.mockClear();

    component.reload();

    expect(mockThreadsApi.getThreads).toHaveBeenCalledTimes(1);
  });
});

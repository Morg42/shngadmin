import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslatePipe } from '@ngx-translate/core';
import { translateTestingModule } from '../../../testing/test-helpers';
import { LoggerLineComponent } from './logger-line.component';

describe('LoggerLineComponent', () => {
  let component: LoggerLineComponent;
  let fixture: ComponentFixture<LoggerLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggerLineComponent, translateTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LoggerLineComponent, { set: { imports: [TranslatePipe] } })
      .compileComponents();

    fixture = TestBed.createComponent(LoggerLineComponent);
    component = fixture.componentInstance;
    // All @Input() fields are required by the template
    component.loggerName = 'plugins.test';
    component.loggerActive = false;
    component.definedHandlers = [];
    component.logger = { level: 'DEFAULT', active: { level: 'DEFAULT' }, propagate: true } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getParent() returns the parent logger name', () => {
    expect(component.getParent('plugins.backend.server')).toBe('plugins.backend');
    expect(component.getParent('plugins')).toBe('');
  });

  it('baseName() returns the file basename', () => {
    expect(component.baseName('/some/path/file.py')).toBe('file.py');
    expect(component.baseName('/some/path/file.py', false)).toBe('file');
    expect(component.baseName('simple')).toBe('simple');
  });

  it('loggerIsDeletable() returns correct values', () => {
    // Non-deletable root loggers
    expect(component.loggerIsDeletable('plugins')).toBe(false);
    expect(component.loggerIsDeletable('logics')).toBe(false);
    expect(component.loggerIsDeletable('items')).toBe(false);
    expect(component.loggerIsDeletable('lib')).toBe(false);

    // Deletable sub-loggers
    expect(component.loggerIsDeletable('plugins.backend')).toBe(true);
    expect(component.loggerIsDeletable('logics.mylogic')).toBe(true);
    expect(component.loggerIsDeletable('items.myitem')).toBe(true);

    // Other loggers: not deletable
    expect(component.loggerIsDeletable('some.other')).toBe(false);
  });

  it('levelOptions has 8 entries', () => {
    expect(component.levelOptions).toHaveLength(8);
  });
});

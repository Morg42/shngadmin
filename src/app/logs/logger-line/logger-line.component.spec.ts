import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LoggerLineComponent } from './logger-line.component';

describe('LoggerLineComponent', () => {
  let component: LoggerLineComponent;
  let fixture: ComponentFixture<LoggerLineComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LoggerLineComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoggerLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

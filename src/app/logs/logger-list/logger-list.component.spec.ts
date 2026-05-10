import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LoggerListComponent } from './logger-list.component';

describe('LoggerListComponent', () => {
  let component: LoggerListComponent;
  let fixture: ComponentFixture<LoggerListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LoggerListComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoggerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

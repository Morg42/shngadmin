import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LoggerTabComponent } from './logger-tab.component';

describe('LoggerTabComponent', () => {
  let component: LoggerTabComponent;
  let fixture: ComponentFixture<LoggerTabComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LoggerTabComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoggerTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LogDisplayComponent } from './log-display.component';

describe('LogDisplayComponent', () => {
  let component: LogDisplayComponent;
  let fixture: ComponentFixture<LogDisplayComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LogDisplayComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LogDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

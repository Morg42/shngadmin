import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LogicsEditComponent } from './logics-edit.component';

describe('LogicsEditComponent', () => {
  let component: LogicsEditComponent;
  let fixture: ComponentFixture<LogicsEditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LogicsEditComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LogicsEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LogicsListComponent } from './logics-list.component';

describe('LogicsListComponent', () => {
  let component: LogicsListComponent;
  let fixture: ComponentFixture<LogicsListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LogicsListComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LogicsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

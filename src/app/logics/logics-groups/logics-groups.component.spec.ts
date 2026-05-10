import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LogicsGroupsComponent } from './logics-groups.component';

describe('LogicsGroupsComponent', () => {
  let component: LogicsGroupsComponent;
  let fixture: ComponentFixture<LogicsGroupsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LogicsGroupsComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LogicsGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

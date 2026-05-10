import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SchedulersComponent } from './schedulers.component';

describe('SchedulersComponent', () => {
  let component: SchedulersComponent;
  let fixture: ComponentFixture<SchedulersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [SchedulersComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SchedulersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

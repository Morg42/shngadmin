import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ThreadsComponent } from './threads.component';

describe('ThreadsComponent', () => {
  let component: ThreadsComponent;
  let fixture: ComponentFixture<ThreadsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [ThreadsComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ThreadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

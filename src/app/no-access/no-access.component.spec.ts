import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NoAccessComponent } from './no-access.component';

describe('NoAccessComponent', () => {
  let component: NoAccessComponent;
  let fixture: ComponentFixture<NoAccessComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [NoAccessComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NoAccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

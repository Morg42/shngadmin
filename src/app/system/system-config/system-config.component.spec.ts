import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SystemConfigComponent } from './system-config.component';

describe('SystemConfigComponent', () => {
  let component: SystemConfigComponent;
  let fixture: ComponentFixture<SystemConfigComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [SystemConfigComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SystemConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

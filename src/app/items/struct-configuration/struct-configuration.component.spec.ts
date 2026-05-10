import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { StructConfigurationComponent } from './struct-configuration.component';

describe('StructConfigurationComponent', () => {
  let component: StructConfigurationComponent;
  let fixture: ComponentFixture<StructConfigurationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [StructConfigurationComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StructConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

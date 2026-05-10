import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LoggingConfigurationComponent } from './logging-configuration.component';

describe('LoggingConfigurationComponent', () => {
  let component: LoggingConfigurationComponent;
  let fixture: ComponentFixture<LoggingConfigurationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LoggingConfigurationComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoggingConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

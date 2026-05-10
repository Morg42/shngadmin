import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoggerTabComponent } from './logger-tab.component';

describe('LoggerTabComponent', () => {
  let component: LoggerTabComponent;
  let fixture: ComponentFixture<LoggerTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggerTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoggerTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

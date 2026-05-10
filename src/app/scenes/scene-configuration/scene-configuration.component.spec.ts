import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SceneConfigurationComponent } from './scene-configuration.component';

describe('SceneConfigurationComponent', () => {
  let component: SceneConfigurationComponent;
  let fixture: ComponentFixture<SceneConfigurationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [SceneConfigurationComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SceneConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

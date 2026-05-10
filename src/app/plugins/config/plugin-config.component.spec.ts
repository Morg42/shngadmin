import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PluginConfigComponent } from './plugin-config.component';

describe('PluginConfigComponent', () => {
  let component: PluginConfigComponent;
  let fixture: ComponentFixture<PluginConfigComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [PluginConfigComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PluginConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

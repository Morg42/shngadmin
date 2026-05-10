import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ItemConfigurationComponent } from './item-configuration.component';

describe('ItemConfigurationComponent', () => {
  let component: ItemConfigurationComponent;
  let fixture: ComponentFixture<ItemConfigurationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [ItemConfigurationComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

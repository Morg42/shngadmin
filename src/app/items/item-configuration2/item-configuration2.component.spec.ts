import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ItemConfiguration2Component } from './item-configuration2.component';

describe('ItemConfigurationComponent', () => {
  let component: ItemConfiguration2Component;
  let fixture: ComponentFixture<ItemConfiguration2Component>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [ItemConfiguration2Component]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemConfiguration2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

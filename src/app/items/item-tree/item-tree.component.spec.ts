import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ItemTreeComponent } from './item-tree.component';

describe('ItemTreeComponent', () => {
  let component: ItemTreeComponent;
  let fixture: ComponentFixture<ItemTreeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [ItemTreeComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

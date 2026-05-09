import { TestBed } from '@angular/core/testing';

import { ItemsApiService } from './items-api.service';

describe('LogicsApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ItemsApiService = TestBed.inject(ItemsApiService);
    expect(service).toBeTruthy();
  });
});

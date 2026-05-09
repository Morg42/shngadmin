
import { TestBed } from '@angular/core/testing';

import { ServicesApiService } from './services-api.service';

describe('ServicesApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ServicesApiService = TestBed.inject(ServicesApiService);
    expect(service).toBeTruthy();
  });
});

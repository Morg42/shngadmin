import { TestBed } from '@angular/core/testing';

import { ThreadsApiService } from './threads-api.service';

describe('ThreadsApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ThreadsApiService = TestBed.inject(ThreadsApiService);
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { FilesApiService } from './files-api.service';

describe('FilesApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FilesApiService = TestBed.inject(FilesApiService);
    expect(service).toBeTruthy();
  });
});

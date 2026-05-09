import { TestBed } from '@angular/core/testing';

import { PluginsApiService } from './plugins-api.service';

describe('PluginsApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PluginsApiService = TestBed.inject(PluginsApiService);
    expect(service).toBeTruthy();
  });
});

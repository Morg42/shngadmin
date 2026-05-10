import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { translateTestingModule } from '../../../testing/test-helpers';
import { OlddataService } from './olddata.service';

describe('OlddataService', () => {
  let service: OlddataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: 'BASE_URL', useValue: 'http://localhost/' },
        OlddataService,
      ],
    });
    service = TestBed.inject(OlddataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('baseUrl is set from the BASE_URL token', () => {
    expect(service.baseUrl).toBe('http://localhost/');
  });
});

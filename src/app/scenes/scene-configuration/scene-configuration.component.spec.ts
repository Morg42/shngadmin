import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { SceneConfigurationComponent } from './scene-configuration.component';
import { ServerApiService } from '../../common/services/server-api.service';
import { AuthService } from '../../common/services/auth.service';
import { AppConfigService } from '../../common/services/app-config.service';
import { TranslatePipe } from '@ngx-translate/core';
import {translateTestingModule, 
  createMockAuthService,
  createMockAppConfigService} from '../../../testing/test-helpers';

describe('SceneConfigurationComponent', () => {
  let component: SceneConfigurationComponent;
  let fixture: ComponentFixture<SceneConfigurationComponent>;

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [
        SceneConfigurationComponent,
        translateTestingModule,
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(SceneConfigurationComponent, { set: { imports: [TranslatePipe] } })
    .compileComponents();

    fixture = TestBed.createComponent(SceneConfigurationComponent);
    component = fixture.componentInstance;
    (component as any).codeEditor = { codeMirror: { getOption: jest.fn(() => false), setSize: jest.fn(), refresh: jest.fn(), state: { completionActive: false } } };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

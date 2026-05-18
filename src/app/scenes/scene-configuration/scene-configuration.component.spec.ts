import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureFileList from '../../../testing/fixtures/api/files/scenes/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { FilesApiService } from '../../common/services/files-api.service';
import { ScenesApiService } from '../../common/services/scenes-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';
import { SceneConfigurationComponent } from './scene-configuration.component';

describe('SceneConfigurationComponent', () => {
  let component: SceneConfigurationComponent;
  let fixture: ComponentFixture<SceneConfigurationComponent>;

  const mockFilesApi = {
    getfileList: () => of(fixtureFileList),
    readFile: () => of(''),
    saveFile: () => of(true),
    deleteFile: () => of(true),
  };

  const mockScenesApi = {
    reloadScene: () => of({}),
    reloadScenes: () => of({}),
  };

  const mockServicesApi = {
    CheckYamlText: () => of('OK'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneConfigurationComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FilesApiService, useValue: mockFilesApi },
        { provide: ScenesApiService, useValue: mockScenesApi },
        { provide: ServicesApiService, useValue: mockServicesApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SceneConfigurationComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SceneConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate filelist from fixture', () => {
    expect(component.filelist.length).toBe(fixtureFileList.length);
  });

  it('should populate sceneFiles SelectItem list with fixture entries', () => {
    expect(component.sceneFiles.length).toBe(fixtureFileList.length);
  });

  it('should set first sceneFile label to first fixture filename', () => {
    expect(component.sceneFiles[0].label).toBe(fixtureFileList[0]);
  });

  it('should set first sceneFile value to first fixture filename', () => {
    expect(component.sceneFiles[0].value).toBe(fixtureFileList[0]);
  });
});

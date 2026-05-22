import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import fixtureFileList from '../../../testing/fixtures/api/files/items/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { FilesApiService } from '../../common/services/files-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';
import { ItemConfigurationComponent } from './item-configuration.component';

describe('ItemConfigurationComponent', () => {
  let component: ItemConfigurationComponent;
  let fixture: ComponentFixture<ItemConfigurationComponent>;

  const mockFilesApi = {
    getfileList: () => of(fixtureFileList),
    readFile: () => of(''),
    saveFile: () => of(true),
    deleteFile: () => of(true),
  };

  const mockServicesApi = {
    CheckYamlText: () => of('OK'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemConfigurationComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FilesApiService, useValue: mockFilesApi },
        { provide: ServicesApiService, useValue: mockServicesApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ItemConfigurationComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ItemConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate filelist from fixture', () => {
    expect(component.filelist.length).toBe(fixtureFileList.length);
  });

  it('should populate itemFiles SelectItem list with fixture entries', () => {
    expect(component.itemFiles.length).toBe(fixtureFileList.length);
  });

  it('should set first itemFile label to first fixture filename', () => {
    expect(component.itemFiles[0].label).toBe(fixtureFileList[0]);
  });

  it('should set first itemFile value to first fixture filename', () => {
    expect(component.itemFiles[0].value).toBe(fixtureFileList[0]);
  });
});

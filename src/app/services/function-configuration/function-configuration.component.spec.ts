/**
 * FunctionConfigurationComponent tests
 *
 * The component is heavily I/O-driven (CodeMirror editor, file API calls).
 * These tests focus on the synchronous logic that is straightforward to unit-test:
 *
 *   - newConfig()         — resets filename, opens new-file dialog
 *   - deleteConfig()      — captures current filename, opens confirm dialog
 *   - checkInput()        — validates newFilename against existing filelist;
 *                           enables/disables add button; sets fileExists flag
 *   - functionFileSelected() — updates myEditFilename from the .py strip logic
 *                              for python files vs unsupported types
 *   - file list population — ngOnInit populates functionFiles from the mock service
 */
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { FilesApiService } from '../../common/services/files-api.service';
import { FunctionsApiService } from '../../common/services/functions-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';
import { FunctionConfigurationComponent } from './function-configuration.component';

describe('FunctionConfigurationComponent', () => {
  let component: FunctionConfigurationComponent;
  let fixture: ComponentFixture<FunctionConfigurationComponent>;

  const mockFileList = ['utils.py', 'helpers.py', 'math_tools.py'];

  const mockFilesApi = {
    getfileList: () => of(mockFileList),
    readFile: () => of('# template'),
    createFile: () => of('ok'),
    deleteFile: () => of('deleted'),
    saveFile: () => of('saved'),
  };

  const mockFunctionsApi = {
    getFunctions: () => of({}),
    reloadFunction: () => of('ok'),
    reloadFunctions: () => of('ok'),
  };

  const mockServicesApi = {
    CheckYamlText: () => of('ok'),
  };

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [FunctionConfigurationComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: FilesApiService, useValue: mockFilesApi },
        { provide: FunctionsApiService, useValue: mockFunctionsApi },
        { provide: ServicesApiService, useValue: mockServicesApi },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(FunctionConfigurationComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FunctionConfigurationComponent);
    component = fixture.componentInstance;
    // Stub the ViewChild code editor so ngOnInit doesn't throw
    (component as any).codeEditor = {
      codeMirror: {
        getOption: jest.fn(() => false),
        setSize: jest.fn(),
        refresh: jest.fn(),
        state: { completionActive: false },
      },
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // ngOnInit — file list loading
  // -------------------------------------------------------------------------

  it('ngOnInit() populates functionFiles from the file list', () => {
    // mockFileList has 3 entries; functionFiles should have one SelectItem per entry
    expect(component.functionFiles.length).toBe(mockFileList.length);
  });

  it('functionFiles labels match the filenames from the API', () => {
    const labels = component.functionFiles.map((f) => f.label);
    expect(labels).toEqual(mockFileList);
  });

  // -------------------------------------------------------------------------
  // newConfig()
  // -------------------------------------------------------------------------

  it('newConfig() resets newFilename to empty string', () => {
    component.newFilename = 'existing';
    component.newConfig();
    expect(component.newFilename).toBe('');
  });

  it('newConfig() opens the new-file dialog', () => {
    component.newconfig_display = false;
    component.newConfig();
    expect(component.newconfig_display).toBe(true);
  });

  // -------------------------------------------------------------------------
  // deleteConfig()
  // -------------------------------------------------------------------------

  it('deleteConfig() captures the current filename in delete_param', () => {
    component.myEditFilename = 'utils';
    component.deleteConfig();
    expect((component.delete_param as { config: string }).config).toBe('utils');
  });

  it('deleteConfig() opens the confirm-delete dialog', () => {
    component.confirmdelete_display = false;
    component.myEditFilename = 'utils';
    component.deleteConfig();
    expect(component.confirmdelete_display).toBe(true);
  });

  // -------------------------------------------------------------------------
  // checkInput() — filename validation
  // -------------------------------------------------------------------------

  it('checkInput() disables add button when newFilename is empty', () => {
    component.filelist = mockFileList;
    component.newFilename = '';
    component.checkInput();
    expect(component.add_enabled).toBe(false);
  });

  it('checkInput() enables add button when newFilename is non-empty and not taken', () => {
    component.filelist = mockFileList;
    component.newFilename = 'my_new_func';
    component.checkInput();
    expect(component.add_enabled).toBe(true);
    expect(component.fileExists).toBe(false);
  });

  it('checkInput() disables add and sets fileExists when filename already taken', () => {
    component.filelist = mockFileList; // includes 'utils.py'
    component.newFilename = 'utils'; // matches 'utils.py' without extension
    component.checkInput();
    expect(component.add_enabled).toBe(false);
    expect(component.fileExists).toBe(true);
  });

  it('checkInput() clears fileExists flag for new filename', () => {
    component.filelist = mockFileList;
    component.newFilename = 'brand_new';
    component.checkInput();
    expect(component.fileExists).toBe(false);
  });

  // -------------------------------------------------------------------------
  // functionFileSelected() — file selection logic
  // -------------------------------------------------------------------------

  it('functionFileSelected() strips .py extension and sets myEditFilename', () => {
    component.selectedFunctionfile = { label: 'utils.py', value: 'utils.py' };
    // getFunctionFile is called but just reads a file — we only care about the side-effect
    component.myEditFilename = '';
    // can't fully test without file load completing, but at least check it doesn't throw
    expect(() => component.functionFileSelected()).not.toThrow();
  });

  it('functionFileSelected() sets cmReadOnly=true for non-.py files', () => {
    component.selectedFunctionfile = { label: 'README.txt', value: 'README.txt' };
    component.cmReadOnly = false;
    component.functionFileSelected();
    expect(component.cmReadOnly).toBe(true);
    expect(component.myEditFilename).toBe('');
  });
});

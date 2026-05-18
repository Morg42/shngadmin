import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/scenes/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ScenesApiService } from '../../common/services/scenes-api.service';
import { ScenesComponent } from './scenes.component';

describe('ScenesComponent', () => {
  let component: ScenesComponent;
  let fixture: ComponentFixture<ScenesComponent>;

  const mockScenesApi = {
    getScenes: () => of(fixtureData),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenesComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ScenesApiService, useValue: mockScenesApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ScenesComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ScenesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load sceneList from fixture', () => {
    expect(component.sceneList.length).toBe(fixtureData.length);
  });

  it('should set first scene path correctly', () => {
    expect(component.sceneList[0].path).toBe(fixtureData[0].path);
  });

  it('should render one p-accordion-panel per scene', () => {
    const panels = fixture.nativeElement.querySelectorAll('p-accordion-panel');
    expect(panels.length).toBe(fixtureData.length);
  });

  it('should render the first scene path in the first accordion header', () => {
    const header = fixture.nativeElement.querySelector('p-accordion-header span');
    expect(header).toBeTruthy();
    expect(header.textContent.trim()).toBe(fixtureData[0].path);
  });
});

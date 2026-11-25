import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import {
  createMockAttributeCatalogService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AttributeCatalogService } from '../../common/services/attribute-catalog.service';
import { AttributeBrowserComponent } from './attribute-browser.component';

describe('AttributeBrowserComponent', () => {
  let component: AttributeBrowserComponent;
  let fixture: ComponentFixture<AttributeBrowserComponent>;

  const catalog = {
    autotimer: { type: 'str', source: 'core' },
    cache: { type: 'bool', source: 'core' },
    someplugin_attr: { type: 'num', description: { en: 'Plugin attr' }, source: 'someplugin' },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttributeBrowserComponent, translateTestingModule],
      providers: [
        { provide: AttributeCatalogService, useValue: createMockAttributeCatalogService(catalog) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttributeBrowserComponent);
    component = fixture.componentInstance;
  });

  it('open() resets the search field and makes the dialog visible', () => {
    component.attributeBrowserSearch = 'stale query';
    component.open();
    expect(component.attributeBrowserSearch).toBe('');
    expect(component.visible()).toBe(true);
  });

  it('starts with whatever rows/visible the parent bound in', () => {
    fixture.componentRef.setInput('rows', [{ key: 'cache', value: true }]);
    fixture.componentRef.setInput('visible', true);
    expect(component.rows()).toEqual([{ key: 'cache', value: true }]);
    expect(component.visible()).toBe(true);
  });

  it('filteredAttributeGroups excludes attribute names already used in a row', () => {
    fixture.componentRef.setInput('rows', [{ key: 'someplugin_attr', value: '' }]);
    const names = component.filteredAttributeGroups.flatMap((g) => g.entries.map((e) => e.name));
    expect(names).not.toContain('someplugin_attr');
    expect(names).toContain('autotimer');
    expect(names).toContain('cache');
  });

  it('filteredAttributeGroups filters by search text (name or description)', () => {
    TestBed.inject(TranslateService).use('en');
    fixture.componentRef.setInput('rows', []);
    component.attributeBrowserSearch = 'plugin attr';
    const names = component.filteredAttributeGroups.flatMap((g) => g.entries.map((e) => e.name));
    expect(names).toEqual(['someplugin_attr']);
  });

  it('selectAttributeFromBrowser() fills the first empty row and closes the browser', () => {
    fixture.componentRef.setInput('rows', [{ key: '', value: '' }]);
    fixture.componentRef.setInput('visible', true);

    component.selectAttributeFromBrowser('someplugin_attr');

    expect(component.rows()).toEqual([{ key: 'someplugin_attr', value: '' }]);
    expect(component.visible()).toBe(false);
  });

  it('selectAttributeFromBrowser() adds a new row when no row is empty', () => {
    fixture.componentRef.setInput('rows', [{ key: 'autotimer', value: 'true' }]);

    component.selectAttributeFromBrowser('someplugin_attr');

    expect(component.rows()).toEqual([
      { key: 'autotimer', value: 'true' },
      { key: 'someplugin_attr', value: '' },
    ]);
  });

  // model() feedback-loop regression guard: rows is written via a direct
  // update() on its own prior value, not derived by a linkedSignal/computed
  // that recomputes from rows() and gets set back into it - if that pattern
  // ever creeps in here, an in-progress edit to one row would get silently
  // reset the next time some *other* row changes (the exact bug this
  // refactor hit once already, in attribute-value-input.component.ts).
  it('an edit to one row survives selectAttributeFromBrowser() filling a different row', () => {
    fixture.componentRef.setInput('rows', [
      { key: 'cache', value: 'edited-value' },
      { key: '', value: '' },
    ]);

    component.selectAttributeFromBrowser('someplugin_attr');

    expect(component.rows()).toEqual([
      { key: 'cache', value: 'edited-value' },
      { key: 'someplugin_attr', value: '' },
    ]);
  });

  it('two selections in a row each preserve the previous one (no stale-snapshot overwrite)', () => {
    fixture.componentRef.setInput('rows', []);

    component.selectAttributeFromBrowser('autotimer');
    component.selectAttributeFromBrowser('someplugin_attr');

    expect(component.rows()).toEqual([
      { key: 'autotimer', value: '' },
      { key: 'someplugin_attr', value: '' },
    ]);
  });
});

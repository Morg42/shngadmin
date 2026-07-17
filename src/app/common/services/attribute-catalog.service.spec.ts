import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { translateTestingModule } from '../../../testing/test-helpers';
import { AttributeCatalogService } from './attribute-catalog.service';
import { ItemsApiService } from './items-api.service';
import { PluginsApiService } from './plugins-api.service';

describe('AttributeCatalogService', () => {
  let service: AttributeCatalogService;

  beforeEach(() => {
    const mockItemsApi = {
      getCoreItemAttributes: jest.fn().mockReturnValue(
        of({
          autotimer: { type: 'str', description: { de: 'Automatik-Timer', en: 'Autotimer' } },
          cache: { type: 'bool' },
          type: { type: 'str', valid_list: ['bool', 'num', 'str'] },
        }),
      ),
    };

    const mockPluginsApi = {
      getPluginsInfo: jest.fn().mockReturnValue(
        of([
          {
            pluginname: 'someplugin',
            attributes: [
              { name: 'autotimer', type: 'str' },
              { name: 'someplugin_attr', type: 'num', description: { en: 'Plugin attr' } },
              { name: 'type', type: 'bool' },
            ],
          },
        ]),
      ),
    };

    TestBed.configureTestingModule({
      imports: [translateTestingModule],
      providers: [
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: PluginsApiService, useValue: mockPluginsApi },
      ],
    });

    service = TestBed.inject(AttributeCatalogService);
  });

  it('starts with an empty, unloaded catalog before loadAttributeCatalog() runs', () => {
    expect(service.attributeCatalog()).toEqual({});
    expect(service.attributeCatalogLoaded()).toBe(false);
    expect(service.attributeGroups()).toEqual([]);
  });

  describe('after loadAttributeCatalog()', () => {
    beforeEach(() => {
      service.loadAttributeCatalog();
    });

    it('merges core and plugin attributes, plugin entry wins on name collision', () => {
      expect(service.attributeCatalog()['autotimer']).toEqual({
        name: 'autotimer',
        type: 'str',
        source: 'someplugin',
      });
      expect(service.attributeCatalog()['someplugin_attr']).toEqual({
        name: 'someplugin_attr',
        type: 'num',
        description: { en: 'Plugin attr' },
        source: 'someplugin',
      });
    });

    it('a plugin attribute named "type" never overrides core\'s "type" entry (dedicated field)', () => {
      expect(service.attributeCatalog()['type']).toEqual({
        type: 'str',
        valid_list: ['bool', 'num', 'str'],
        source: 'core',
      });
    });

    it('sets attributeCatalogLoaded to true once the merge completes', () => {
      expect(service.attributeCatalogLoaded()).toBe(true);
    });

    it('itemTypeOptions is derived from the catalog "type" attribute valid_list', () => {
      expect(service.itemTypeOptions()).toEqual([
        { label: 'bool', value: 'bool' },
        { label: 'num', value: 'num' },
        { label: 'str', value: 'str' },
      ]);
    });

    // Regression test for the same click-eating pattern fixed in
    // item-tree.component.ts's itemActionsMenuItems: a getter re-evaluated
    // on every read would return a new array/objects each time, and
    // PrimeNG's p-select (bound to this via [options]) renders its list
    // with no trackBy, so it would tear down and rebuild its dropdown on
    // every unrelated read. computed() must keep the same reference across
    // reads until attributeCatalog() actually changes.
    it('itemTypeOptions keeps a stable array reference across repeated reads', () => {
      const first = service.itemTypeOptions();
      const second = service.itemTypeOptions();
      expect(second).toBe(first);
    });

    it('attributeGroups groups suggestions by source, core first, name/type excluded', () => {
      expect(service.attributeGroups().map((g) => g.source)).toEqual(['core', 'someplugin']);
      // autotimer is core-sourced but gets overwritten by the plugin merge above
      // (later entry wins on collision), so only cache remains under 'core' here.
      const coreGroup = service.attributeGroups().find((g) => g.source === 'core');
      expect(coreGroup?.entries.map((e) => e.name)).toEqual(['cache']);
      const pluginGroup = service.attributeGroups().find((g) => g.source === 'someplugin');
      expect(pluginGroup?.entries.map((e) => e.name)).toEqual(['autotimer', 'someplugin_attr']);
    });

    it('attributeDescription() returns "" for attributes with no description (e.g. overwritten by a plugin entry without one)', () => {
      expect(service.attributeDescription('autotimer')).toBe('');
    });

    it('attributeDescription() returns "" for unknown attribute names', () => {
      expect(service.attributeDescription('does_not_exist')).toBe('');
    });

    it('attributeDescription() falls back to English when the current language has no translation', () => {
      TestBed.inject(TranslateService).use('de');
      expect(service.attributeDescription('someplugin_attr')).toBe('Plugin attr');
    });

    it('attributeType() returns the catalog type, "" for unknown attribute names', () => {
      expect(service.attributeType('cache')).toBe('bool');
      expect(service.attributeType('does_not_exist')).toBe('');
    });

    it('attributeValidList() returns the catalog valid_list, undefined when absent', () => {
      expect(service.attributeValidList('type')).toEqual(['bool', 'num', 'str']);
      expect(service.attributeValidList('cache')).toBeUndefined();
    });
  });
});

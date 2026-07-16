import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  translateTestingModule,
} from '../../../../testing/test-helpers';
import { PluginMetaInfo, PluginSectionConfig } from '../../../common/models/plugins-config';
import { AppConfigService } from '../../../common/services/app-config.service';
import { PluginsApiService } from '../../../common/services/plugins-api.service';
import { PluginParameterDialogComponent } from './plugin-parameter-dialog.component';

describe('PluginParameterDialogComponent', () => {
  let component: PluginParameterDialogComponent;
  let fixture: ComponentFixture<PluginParameterDialogComponent>;
  let mockPluginsApi: { setPluginConfig: jest.Mock };

  const meta: PluginMetaInfo = {
    plugin: { type: 'interface', description: { en: 'Test plugin' } },
    parameters: {
      knx_param: { type: 'knx_ga', description: { en: 'KNX group address' } },
      mac_param: { type: 'mac', description: { en: 'MAC address' } },
      ipv4_param: { type: 'ipv4', description: { en: 'IPv4 address' } },
      ipv6_param: { type: 'ipv6', description: { en: 'IPv6 address' } },
      ip_param: { type: 'ip', description: { en: 'IP or hostname' } },
      port_param: { type: 'int', valid_min: 1, valid_max: 65535, description: { en: 'Port' } },
      mandatory_param: { type: 'str', mandatory: true, description: { en: 'Required' } },
      list_param: { type: 'list', description: { en: 'A list' } },
      bool_param: { type: 'bool', description: { en: 'A flag' } },
      fallback_param: { type: 'str', description: { de: 'Nur Deutsch' } },
      // Some real plugin metadata declares 'instance' as a regular editable
      // parameter (multi-instance-capable plugins) - exercised by the
      // copy-from exclusion tests below.
      instance: { type: 'str', description: { en: 'Instance name' } },
    },
  };

  function makeCurrentConfig(): PluginSectionConfig {
    return {
      plugin_name: 'testplugin',
      instance: 'inst1',
      plugin_enabled: true,
      _meta: meta,
      knx_param: '1/2/3',
      mac_param: 'aa:bb:cc:dd:ee:ff',
      ipv4_param: '192.168.1.1',
      ipv6_param: '2001:db8::1',
      ip_param: '192.168.1.1',
      port_param: 8080,
      mandatory_param: 'value',
      list_param: ['a', 'b'],
      bool_param: true,
      fallback_param: 'x',
    };
  }

  beforeEach(async () => {
    mockPluginsApi = {
      setPluginConfig: jest.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [PluginParameterDialogComponent, translateTestingModule],
      providers: [
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PluginParameterDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('configname', 'testplugin');
    fixture.componentRef.setInput('pluginname', 'testplugin');
    fixture.componentRef.setInput('meta', meta);
    fixture.componentRef.setInput('currentConfig', makeCurrentConfig());
  });

  function param(name: string) {
    return component.parameters().find((p) => p['name'] === name)!;
  }

  // ---------------------------------------------------------------------
  // Parameter-table construction
  // ---------------------------------------------------------------------

  it('builds one row per meta parameter, with values read from currentConfig', () => {
    expect(component.parameters().length).toBe(11);
    expect(param('knx_param')['value']).toBe('1/2/3');
    expect(param('port_param')['value']).toBe(8080);
  });

  it('bool type gets synthetic true/false valid_list options', () => {
    expect(param('bool_param')['valid_list']).toEqual([
      { label: 'true', value: true },
      { label: 'false', value: false },
    ]);
  });

  it('list type stringifies the default using the shared delimiter', () => {
    // list_param has no `default` in meta, so this exercises listToString(undefined) -> ''
    expect(param('list_param')['default']).toBe('');
    expect(param('list_param')['value']).toBe('a | b');
  });

  it('falls back through the 3-level description language chain', () => {
    // defaultLanguage 'en' is absent on fallback_param; getFallbackLanguage() ('en') also
    // misses; getFallbackLanguage(1) ('de') hits.
    expect(param('fallback_param')['desc']).toBe('Nur Deutsch');
  });

  it('classic/state/description are derived purely from meta', () => {
    expect(component.classic()).toBe(false);
    expect(component.state()).toBe('');
    expect(component.description()).toBe('Test plugin');
  });

  it('rebuilds parameters fresh every time the dialog opens, discarding unsaved edits', () => {
    param('mandatory_param')['value'] = 'scratch edit';
    component.visible.set(true);
    expect(param('mandatory_param')['value']).toBe('value');
  });

  // ---------------------------------------------------------------------
  // Validators - one passing/failing case per branch
  // ---------------------------------------------------------------------

  const cases: { name: string; bad: unknown }[] = [
    { name: 'knx_param', bad: 'not-an-address' },
    { name: 'mac_param', bad: 'not-a-mac' },
    { name: 'ipv4_param', bad: '999.999.999.999' },
    { name: 'ipv6_param', bad: 'zzzz' },
    { name: 'ip_param', bad: '!!!not valid!!!' },
  ];

  for (const { name, bad } of cases) {
    it(`saveConfig() rejects an invalid ${name} and never calls the API`, () => {
      param(name)['value'] = bad;
      component.saveConfig();
      expect(component.validation_dialog_display).toBe(true);
      expect(mockPluginsApi.setPluginConfig).not.toHaveBeenCalled();
    });
  }

  it('saveConfig() rejects a port_param value below valid_min', () => {
    param('port_param')['value'] = 0;
    component.saveConfig();
    expect(component.validation_dialog_display).toBe(true);
    expect(mockPluginsApi.setPluginConfig).not.toHaveBeenCalled();
  });

  it('saveConfig() rejects a port_param value above valid_max', () => {
    param('port_param')['value'] = 70000;
    component.saveConfig();
    expect(component.validation_dialog_display).toBe(true);
    expect(mockPluginsApi.setPluginConfig).not.toHaveBeenCalled();
  });

  it('saveConfig() rejects an empty mandatory_param', () => {
    param('mandatory_param')['value'] = '';
    component.saveConfig();
    expect(component.validation_dialog_display).toBe(true);
    expect(mockPluginsApi.setPluginConfig).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // Successful save
  // ---------------------------------------------------------------------

  it('saveConfig() posts the config and emits saved when every parameter is valid', () => {
    const saved = jest.fn();
    component.saved.subscribe(saved);

    component.saveConfig();

    expect(mockPluginsApi.setPluginConfig).toHaveBeenCalledTimes(1);
    const [confname, payload] = mockPluginsApi.setPluginConfig.mock.calls[0];
    expect(confname).toBe('testplugin');
    expect(payload.config._meta).toBeUndefined();
    expect(component.visible()).toBe(false);
    expect(saved).toHaveBeenCalledWith({
      confname: 'testplugin',
      enabled: 'true',
      instance: 'inst1',
    });
  });

  it('saveConfig() persists a toggled pluginEnabled instead of silently reverting it', () => {
    // Regression test: pluginEnabled is a linkedSignal that also tracks
    // visible() (see its doc comment) - saveConfig() writes visible.set(false)
    // partway through, and reading pluginEnabled() afterwards used to
    // re-derive it fresh from currentConfig(), discarding the user's toggle.
    //
    // The dialog must actually be open (visible: false -> true is a real
    // value change) for saveConfig()'s later visible.set(false) to be a
    // real transition too - a false -> false write is a same-value no-op
    // that Angular skips, which would mask the bug. The dependency-tracking
    // baseline is also only established on the signal's *first* read - in
    // the real app that happens when the dialog's [(ngModel)]="pluginEnabled"
    // binding renders, well before the user touches the switch.
    component.visible.set(true);
    expect(component.pluginEnabled()).toBe(true);
    component.pluginEnabled.set(false);

    const saved = jest.fn();
    component.saved.subscribe(saved);

    component.saveConfig();

    const [, payload] = mockPluginsApi.setPluginConfig.mock.calls[0];
    expect(payload.config.plugin_enabled).toBe(false);
    expect(saved).toHaveBeenCalledWith({
      confname: 'testplugin',
      enabled: 'false',
      instance: 'inst1',
    });
  });

  it('saveConfig() shows save_error and reopens the dialog when the backend reports failure', () => {
    mockPluginsApi.setPluginConfig.mockReturnValue(of(false));
    const saved = jest.fn();
    component.saved.subscribe(saved);

    component.saveConfig();

    expect(component.saveError()).not.toBeNull();
    expect(component.visible()).toBe(true);
    // saved is emitted optimistically before the network call resolves,
    // matching the original's un-rolled-back row mutation on save failure.
    expect(saved).toHaveBeenCalled();
  });

  it('saveConfig() emits saved synchronously, before the network call resolves', () => {
    let pendingObserver: { next: (v: boolean) => void } | undefined;
    mockPluginsApi.setPluginConfig.mockReturnValue({
      pipe: () => ({
        subscribe: (observer: { next: (v: boolean) => void }) => {
          pendingObserver = observer;
        },
      }),
    });

    const saved = jest.fn();
    component.saved.subscribe(saved);

    component.saveConfig();

    expect(saved).toHaveBeenCalledWith({
      confname: 'testplugin',
      enabled: 'true',
      instance: 'inst1',
    });
    expect(pendingObserver).toBeDefined();
  });

  // ---------------------------------------------------------------------
  // Abort
  // ---------------------------------------------------------------------

  it('abort() closes the dialog and clears saveError', () => {
    component.visible.set(true);
    component.saveError.set('boom');

    component.abort();

    expect(component.visible()).toBe(false);
    expect(component.saveError()).toBeNull();
  });

  // ---------------------------------------------------------------------
  // Inline disable-plugin option
  // ---------------------------------------------------------------------

  it('pluginEnabled defaults to true (enabled) for the fixture config', () => {
    expect(component.pluginEnabled()).toBe(true);
  });

  it('toggling pluginEnabled off is what the inline checkbox does, and it persists on save', () => {
    component.pluginEnabled.set(false);
    component.saveConfig();

    const [, payload] = mockPluginsApi.setPluginConfig.mock.calls[0];
    expect(payload.config.plugin_enabled).toBe(false);
  });

  // ---------------------------------------------------------------------
  // Copy-from dropdown
  // ---------------------------------------------------------------------

  it('copyFromOptions is empty with no siblingConfigs input', () => {
    expect(component.copyFromOptions()).toEqual([]);
  });

  it('copyFromOptions lists each sibling confname as a label/value pair', () => {
    fixture.componentRef.setInput('siblingConfigs', [
      { confname: 'sibling1', config: makeCurrentConfig() },
      { confname: 'sibling2', config: makeCurrentConfig() },
    ]);

    expect(component.copyFromOptions()).toEqual([
      { label: 'sibling1', value: 'sibling1' },
      { label: 'sibling2', value: 'sibling2' },
    ]);
  });

  it('onCopyFromChange() replaces parameters with values derived from the chosen sibling', () => {
    const siblingConfig = makeCurrentConfig();
    siblingConfig.mandatory_param = 'copied-value';
    siblingConfig.port_param = 9090;
    fixture.componentRef.setInput('siblingConfigs', [
      { confname: 'sibling1', config: siblingConfig },
    ]);
    component.copyFromSelection.set('sibling1');

    component.onCopyFromChange('sibling1');

    expect(param('mandatory_param')['value']).toBe('copied-value');
    expect(param('port_param')['value']).toBe(9090);
  });

  it("onCopyFromChange() does not copy the sibling's instance value (regression: would recreate the exact instance-name collision the add flow's auto-assignment prevents)", () => {
    const siblingConfig = makeCurrentConfig();
    siblingConfig.instance = 'sibling-instance';
    siblingConfig.mandatory_param = 'copied-value';
    fixture.componentRef.setInput('siblingConfigs', [
      { confname: 'sibling1', config: siblingConfig },
    ]);
    expect(param('instance')['value']).toBe('inst1'); // this dialog's own instance, before copying

    component.onCopyFromChange('sibling1');

    expect(param('instance')['value']).toBe('inst1'); // unchanged
    expect(param('mandatory_param')['value']).toBe('copied-value'); // everything else did copy
  });

  it('copyFromSelection is not reset after applying a copy (regression: resetting it synchronously inside its own change handler left the p-select showing a stale label, silently breaking the next pick)', () => {
    fixture.componentRef.setInput('siblingConfigs', [
      { confname: 'sibling1', config: makeCurrentConfig() },
    ]);
    // [(ngModel)] already updated the signal by the time (ngModelChange)
    // fires the handler - mirror that here rather than calling the handler
    // in isolation.
    component.copyFromSelection.set('sibling1');

    component.onCopyFromChange('sibling1');

    expect(component.copyFromSelection()).toBe('sibling1');
  });

  it('copyFromSelection resets fresh every time the dialog opens (visible() transitions)', () => {
    fixture.componentRef.setInput('siblingConfigs', [
      { confname: 'sibling1', config: makeCurrentConfig() },
    ]);
    // Establishes visible() as a tracked dependency (see parameters/pluginEnabled's
    // own regression tests above for why this first read matters, and why the
    // later transition below must be a real false -> true change).
    expect(component.copyFromSelection()).toBeNull();
    component.copyFromSelection.set('sibling1');
    expect(component.copyFromSelection()).toBe('sibling1');

    component.visible.set(true);

    expect(component.copyFromSelection()).toBeNull();
  });

  it('onCopyFromChange() with an unknown confname leaves parameters untouched', () => {
    fixture.componentRef.setInput('siblingConfigs', [
      { confname: 'sibling1', config: makeCurrentConfig() },
    ]);
    const before = component.parameters();

    component.onCopyFromChange('does-not-exist');

    expect(component.parameters()).toBe(before);
  });
});

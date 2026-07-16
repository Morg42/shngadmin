import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle, faLaptopCode } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '@ngx-translate/core';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { PrimeTemplate } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { PluginsInstalled } from '../../../common/models/plugins-installed';
import { LogService } from '../../../common/services/log.service';
import { PluginsApiService } from '../../../common/services/plugins-api.service';
import { SharedService } from '../../../common/services/shared.service';

/** Extracted from PluginConfigComponent's "add a plugin instance" flow.
 *  Bundles the set-configuration-name sub-dialog, which is only ever
 *  reached from inside this same flow. Self-fetches the installed-plugin
 *  list whenever it's opened, rather than the parent feeding it down. */
@Component({
  selector: 'app-add-plugin-dialog',
  templateUrl: './add-plugin-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Accordion,
    AccordionContent,
    AccordionHeader,
    AccordionPanel,
    ButtonDirective,
    Dialog,
    FaIconComponent,
    FormsModule,
    InputText,
    NgStyle,
    PrimeTemplate,
    ProgressSpinner,
    ToggleSwitch,
    TranslatePipe,
  ],
})
export class AddPluginDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly pluginsApi = inject(PluginsApiService);
  private readonly shared = inject(SharedService);
  private readonly log = inject(LogService);

  readonly faExclamationTriangle = faExclamationTriangle;
  readonly faCode = faLaptopCode;

  readonly visible = model(false);

  /** confnames already in use, for the set-config-name step's uniqueness check. */
  readonly existingConfigNames = input<string[]>([]);

  readonly added = output<string>();

  readonly loading = signal(false);

  plugintypes: string[] = ['system', 'gateway', 'interface', 'protocol', 'web', 'unclassified'];
  plugintypes_expanded: boolean[] = [];
  private add_firstrun = true;

  readonly plugins_installed = signal<PluginsInstalled>({} as PluginsInstalled);
  readonly plugins_installed_list = signal<string[]>([]);

  readonly addDialogFilter = signal('');
  addDialogCategorized = false;

  // set configuration name sub-dialog
  setconfig_display = false;
  selected_plugin!: string;
  pluginconfig_name!: string;
  translate_params: {} = {};
  add_enabled!: boolean;

  onAddFilterChange(value: string): void {
    this.addDialogFilter.set(value);
  }

  clearAddFilter(): void {
    this.addDialogFilter.set('');
  }

  readonly addDialogFilteredList = computed<string[]>(() => {
    const f = this.addDialogFilter().toLowerCase();
    const list = f
      ? this.plugins_installed_list().filter(
          (name) =>
            name.toLowerCase().includes(f) ||
            (this.plugins_installed()[name]?.disp_description ?? '').toLowerCase().includes(f),
        )
      : [...this.plugins_installed_list()];
    return list.sort((a, b) => a.localeCompare(b));
  });

  matchesAddFilter(name: string): boolean {
    if (!this.addDialogFilter()) return true;
    const f = this.addDialogFilter().toLowerCase();
    return (
      name.toLowerCase().includes(f) ||
      (this.plugins_installed()[name]?.disp_description ?? '').toLowerCase().includes(f)
    );
  }

  hasMatchingPlugins(plugintype: string): boolean {
    return this.plugins_installed_list().some((name) => {
      const inType =
        this.plugins_installed()[name]?.type === plugintype ||
        (plugintype === 'unclassified' &&
          this.plugintypes.indexOf(this.plugins_installed()[name]?.type) === -1);
      return inType && this.matchesAddFilter(name);
    });
  }

  /** Bound to the dialog's (onShow) - refetches every time it's opened,
   *  matching the original addPluginDialog()'s always-refetch behavior. */
  loadInstalledPlugins(): void {
    for (let i = 0; i < this.plugintypes.length; i++) {
      this.plugintypes_expanded[i] = !this.add_firstrun;
    }
    this.add_firstrun = false;

    this.loading.set(true);
    this.pluginsApi
      .getInstalledPlugins()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const installed = <PluginsInstalled>response;
        this.log.log('AddPluginDialogComponent.loadInstalledPlugins', { response });

        for (const p in installed) {
          if (p in installed) {
            installed[p]['disp_description'] = this.shared.getDescription(
              installed[p].description as Record<string, string>,
            );
          }
        }
        this.plugins_installed.set(installed);
        this.plugins_installed_list.set(Object.keys(installed));
        this.loading.set(false);

        for (let i = 0; i < this.plugintypes.length; i++) {
          this.plugintypes_expanded[i] = false;
        }
      });
  }

  selectPlugin(iplugin: string) {
    this.log.warn({ iplugin });
    this.selected_plugin = iplugin;
    this.pluginconfig_name = iplugin;
    this.translate_params = { selected_plugin: this.selected_plugin };
    this.checkInput();

    this.setconfig_display = true;
  }

  checkInput() {
    this.add_enabled = false;
    if (this.pluginconfig_name.length > 0) {
      this.add_enabled = true;
      for (const name of this.existingConfigNames()) {
        if (name === this.pluginconfig_name) {
          this.add_enabled = false;
        }
      }
    }
    this.log.warn(this.add_enabled);
    return this.add_enabled;
  }

  addPlugin() {
    if (!this.checkInput()) return;

    const configname = this.pluginconfig_name;
    const pluginname = this.selected_plugin;

    this.setconfig_display = false;
    this.visible.set(false);

    const config = { plugin_name: pluginname, plugin_enabled: true };

    this.pluginsApi
      .addPluginConfig(configname, { config })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (response === true) {
          this.added.emit(configname);
        }
      });
  }
}

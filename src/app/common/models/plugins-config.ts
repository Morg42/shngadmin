//
// Datatype for <shng-server>:<port>/api/plugins/config.json
//
export interface PluginsConfig {
  plugin_config: Record<string, Record<string, unknown>>;
}

export interface PluginParamMeta {
  type?: string;
  gui_type?: string;
  valid_list?: unknown[];
  valid_min?: number;
  valid_max?: number;
  default?: unknown;
  mandatory?: boolean;
  description?: Record<string, string> | string;
  hide?: boolean;
}

export interface PluginMetaInfo {
  plugin?: {
    state?: string;
    type?: string;
    description?: Record<string, string> | string;
  };
  parameters?: Record<string, PluginParamMeta>;
}

export interface PluginSectionConfig {
  plugin_name?: string;
  instance?: string;
  _meta?: PluginMetaInfo;
  _loaded?: boolean;
  /** True if a pull updated the plugin's files and it still runs the old code (until reloaded or the core restarts). */
  _reload_pending?: boolean;
  /** Only meaningful when _loaded is true (mirrors SmartPlugin.alive). */
  _running?: boolean;
  plugin_enabled?: boolean | string;
  _description?: unknown;
  [key: string]: unknown;
}

//
// Datatype for <shng-server>:<port>/api/installed
//
export interface PluginInstalled {
  type: string;
  description: Record<string, string> | string;
  disp_description?: string;
  version: string;
  state: string;
  documentation: string;
  multi_instance: string;
  configuration_needed: boolean;
}

export interface PluginsInstalled {
  [key: string]: PluginInstalled;
}

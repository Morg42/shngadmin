import { PluginItemAttribute } from './plugin-item-attribute';
import { PluginMetadata } from './plugin-metadata';
import { PluginParameter } from './plugin-parameter';

//
// Datatype for <shng-server>:<port>/api/plugins/info
//
export interface PlugininfoType {
  pluginname: string;
  configname: string;
  version: string;
  state: string;
  smartplugin: boolean;
  multiinstance: boolean;
  configuration_needed: boolean;
  instancename: string;
  webif_url: string;
  blog_url: string;
  parameters: PluginParameter[];
  arttibutes: PluginItemAttribute[];
  attributes?: PluginItemAttribute[];
  metadata: PluginMetadata;
  documentation_config_doc: string;
  documentation_user_doc: string;
  stoppable: boolean;
  stopped: boolean;
  triggers: string[];
}

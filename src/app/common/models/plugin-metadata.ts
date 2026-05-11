//
// Datatype (subtype) for <shng-server>:<port>/api/plugins/info
//
export interface PluginMetadata {
  type: string;
  description: string;
  description_long: string;
  documentation: string;
  support: string;
  keywords: string;
  maintainer: string;
  tester: string;
  classpath: string;
  classname: string;
  sh_minversion: string;
  sh_maxversion: string;
  state?: string;
}

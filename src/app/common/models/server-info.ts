//
// Datatype for <shng-server>:<port>/api/server
//
export interface ServerInfo {
  login_required: boolean;
  default_language: string;
  fallback_language_order: string;
  client_ip: string;
  itemtree_fullpath: boolean;
  itemtree_searchstart: number;
  tz: string;
  tzname: string;
  tznameST: string;
  tznameDST: string;
  core_branch: string;
  plugins_branch: string;
  websocket_host: string;
  websocket_port: string;
  log_chunksize: number;
  developer_mode: boolean;
  click_dropdown_header: boolean;
  daemon_knx: string;
  daemon_ow: string;
  daemon_mqtt: string;
  daemon_node_red: string;
  backup_stem: string;
  last_backup: string;
}

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
  // Optional: only present once the backend's modules/admin/module.yaml has
  // the start_page parameter (added after this field was) - fall back to
  // 'dashboard' when reading it rather than assuming it's always sent.
  start_page?: string;
  log_chunksize: number;
  developer_mode: boolean;
  click_dropdown_header: boolean;
  help_local_available: boolean;
  dark_mode: boolean;
  resource_graph_period: string;
  restart_stops_only: boolean;
  daemon_knx: string;
  daemon_ow: string;
  daemon_mqtt: string;
  daemon_node_red: string;
  backup_stem: string;
  last_backup: string;
}

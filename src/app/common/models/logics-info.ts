import { LogicsWatchItem } from './logics-watch-item';

//
// Datatype for <shng-server>:<port>/api/logics
//
export interface LogicsinfoType {
  crontab: string | string[] | null;
  cycle: string | null;
  /** Seconds a run may take before a warning is logged; null/undefined = global default, 0 = off. */
  runtime_warn?: number | null;
  /** Seconds after which a run is cancelled automatically; null/undefined = never. */
  runtime_cancel?: number | null;
  enabled: boolean;
  filename: string;
  last_run: string;
  logictype: string;
  group?: string[] | string | null;
  name: string;
  logic_description?: string;
  description?: string;
  watch_item_list?: LogicsWatchItem[];
  next_exec: string;
  pathname: string;
  userlogic: boolean;
  visu_acl: string;
  watch_item: LogicsWatchItem[];
}

export interface LogicsGroupType {
  name?: string;
  title: string;
  description: string;
  unknown?: boolean; // true when group name is not defined in logic_groups.yaml
}

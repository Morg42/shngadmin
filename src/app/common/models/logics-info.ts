import { LogicsWatchItem } from './logics-watch-item';

//
// Datatype for <shng-server>:<port>/api/logics
//
export interface LogicsinfoType {
  crontab: any;
  cycle: string | null;
  enabled: boolean;
  filename: string;
  last_run: string;
  logictype: string;
  group?: any;
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
}

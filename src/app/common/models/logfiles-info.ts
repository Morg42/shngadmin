//
// Datatype for <shng-server>:<port>/api/logs
//

export interface LogsInfoDict {
  [key: string]: string[];
}

export interface LogsType {
  logs: LogsInfoDict;
  default: string;
}

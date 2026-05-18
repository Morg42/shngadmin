//
// Datatypes for <shng-server>:<port>/api/loggers
//

export interface LoggerActiveInfo {
  disabled: boolean;
  level: string;
  filters: string[];
  handlers: string[];
  logfiles: string[];
  parent_handlers_names?: string[];
}

export interface LoggerInfo {
  level: string;
  handlers: string[];
  active: LoggerActiveInfo;
  not_conf?: boolean;
  propagate?: boolean;
}

/** Full response shape returned by GET /api/loggers/ */
export interface LoggersApiResponse {
  loggers: Record<string, LoggerInfo>;
  active_plugins: string[];
  active_logics: string[];
  defined_handlers: string[];
}

/** The inner loggers dict — what components store after extracting response.loggers */
export type LoggersType = Record<string, LoggerInfo>;

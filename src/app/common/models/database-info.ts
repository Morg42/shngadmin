//
// Datatype for GET /api/database/info - connection properties of the
// configured `database` plugin instance, for the dashboard's optional
// database-properties widget. `configured: false` means no `database`
// plugin instance is loaded (or the request failed) - every other field
// is then absent.
//
export interface DatabaseInfo {
  configured: boolean;
  driver?: string;
  database?: string;
  host?: string;
  journal_mode?: string;
  connected?: boolean;
  version?: string;
  query_timeout?: number;
}

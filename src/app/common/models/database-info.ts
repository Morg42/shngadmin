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
  // psycopg(2) only - reality-checked against the database itself, not
  // plugin.yaml's config. null means the check itself failed (e.g. the
  // TimescaleDB extension isn't installed); absent means not applicable
  // (a non-psycopg driver, or the database is disconnected).
  hypertable?: boolean | null;
  native_cagg?: boolean | null;
  native_retention?: boolean | null;
}

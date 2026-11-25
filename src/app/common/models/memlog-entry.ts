//
// Datatype for <shng-server>:<port>/api/logs/{name} when {name} identifies
// an in-memory log (e.g. 'env.core.log') rather than a file on disk.
//

export interface MemlogEntry {
  time: string;
  thread: string;
  level: string;
  message: string;
}

export interface MemlogResponse {
  name: string;
  entries: MemlogEntry[];
}

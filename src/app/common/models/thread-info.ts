//
// Datatype for <shng-server>:<port>/api/threads
//
export interface ThreadInfo {
  name: string;
  sort: string;
  id: string;
  native_id: string;
  alive: boolean;
}

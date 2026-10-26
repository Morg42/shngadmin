//
// Datatype for the response of PUT <shng-server>:<port>/api/server/pull_{core,plugins,all}
//
export type PullTarget = 'core' | 'plugins' | 'all';

export type PullRepoName = Exclude<PullTarget, 'all'>;

export interface PullRepoResult {
  repo: PullRepoName;
  status: 'ok' | 'error' | 'skipped';
  /** git's output, or the reason for an error or skip */
  text: string;
  /** True if the checkout moved, i.e. the files on disk differ from what the running core loaded */
  changed: boolean;
  /** Paths that differ between the old and the new HEAD, relative to the repository root */
  files: string[];
}

/** What the pulled changes demand of the running core. */
export interface PullImpact {
  /** Why a restart is needed; empty if none is */
  restart: string[];
  /** Configuration names of the plugins to reload instead; always empty if a restart is needed */
  reload: string[];
}

export interface PullResponse {
  result: 'ok' | 'error';
  /** Set if the request was refused as a whole, e.g. because another pull is running */
  text?: string;
  repos: PullRepoResult[];
  /** Missing if the request was refused as a whole */
  impact?: PullImpact;
}

export type PullRepoState =
  | 'current'
  | 'behind'
  | 'ahead'
  | 'diverged'
  | 'blocked'
  | 'no_upstream'
  | 'unknown';

/** How a checkout stands against its upstream, as of a fresh fetch. */
export interface PullRepoCheck {
  repo: PullRepoName;
  /** 'blocked': behind, but a local change is in the way of the fast-forward */
  state: PullRepoState;
  /** upstream commits the checked-out branch does not have */
  behind: number;
  /** commits the checked-out branch has that the upstream does not */
  ahead: number;
  /** why the state is 'blocked', 'diverged', 'no_upstream' or 'unknown', otherwise '' */
  text: string;
}

/** Response of GET <shng-server>:<port>/api/server/pull_status */
export interface PullStatusResponse {
  result: 'ok' | 'error';
  /** Set if the request was refused as a whole, e.g. because a pull is running */
  text?: string;
  repos: PullRepoCheck[];
}

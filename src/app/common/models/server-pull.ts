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
  /** True if the checkout moved, i.e. a core restart is needed to run the new code */
  changed: boolean;
}

export interface PullResponse {
  result: 'ok' | 'error';
  /** Set if the request was refused as a whole, e.g. because another pull is running */
  text?: string;
  repos: PullRepoResult[];
}

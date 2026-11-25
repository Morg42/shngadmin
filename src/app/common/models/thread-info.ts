//
// Datatype for <shng-server>:<port>/api/threads
//

/** Kind of scheduler task: logic, item cycle/crontab/autotimer, or plugin/core method. */
export type RunningTaskType = 'logic' | 'item' | 'method';

/** Scheduler task currently running on a worker thread. */
export interface RunningTaskInfo {
  type: RunningTaskType;
  /** Scheduler name, e.g. 'logics.my_logic' or 'plugins.foo.poll'. */
  name: string;
  /** ISO 8601 timestamp of the task start. */
  started_at: string;
  /** Seconds since the task started, at the time of the request. */
  runtime: number;
  /** Seconds after which the core logs a runtime warning; 0 = disabled. */
  runtime_warn: number;
  /** True once runtime has reached runtime_warn. */
  overdue: boolean;
  /** Trigger dict of a logic (by, source, source_details, dest, value); null for other task types. */
  trigger: Record<string, unknown> | null;
  /** Unique id of this task run; cancellation targets it, so a later task on the same thread is never hit. */
  task_id: number;
  /** True if the task can be cancelled (logics only). */
  cancellable: boolean;
  /** Seconds since the first cancellation request; null if never requested. */
  cancel_requested: number | null;
  /** Number of cancellation requests so far. */
  cancel_requests: number;
}

/**
 * Outcome of a cancellation request: requested, task already gone (not_found),
 * task is no logic (not_cancellable), or any other failure (error).
 */
export type CancelOutcome = 'requested' | 'not_found' | 'not_cancellable' | 'error';

export interface ThreadInfo {
  name: string;
  sort: string;
  id: string;
  native_id: string;
  alive: boolean;
  /** Present while the thread runs a scheduler task. */
  task?: RunningTaskInfo;
}

/** Datatype for <shng-server>:<port>/api/threads/<ident> */
export interface ThreadTaskDetails {
  id: number;
  task: RunningTaskInfo;
  /** Call stack frames as formatted by Python's traceback.format_stack(). */
  stack: string[];
}

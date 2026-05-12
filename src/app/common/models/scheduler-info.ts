//
// Datatype for <shng-server>:<port>/api/schedulers
//
export interface SchedulerInfo {
  group: string;
  name: string;
  next: string;
  cycle: string;
  cron: string;
  prio: number;
  active: boolean;
  value: unknown;
  by: string;
  task_type: string;
  task_name: string;
}

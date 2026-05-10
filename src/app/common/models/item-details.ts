//
// Datatype for <shng-server>:<port>/admin/items.json
//

export interface ItemDetails {
  path: string;
  name: string;
  description?: string;
  type: string;
  struct?: string;
  value: string | boolean;
  change_age: number;
  update_age: number;
  last_update: string;
  last_change: string;
  changed_by: string;
  updated_by: string;
  last_value: string;
  previous_value: string;
  previous_change_age: number;
  previous_update_age: number;
  previous_update: string;
  previous_change: string;
  previous_update_by: string;
  previous_change_by: string;
  enforce_updates: string;
  enforce_change: string;
  cache: string;
  eval: string;
  trigger: string;
  trigger_condition: string;
  trigger_condition_raw: string;
  hysteresis_input: string;
  hysteresis_upper_threshold: string;
  hysteresis_lower_threshold: string;
  on_update: string;
  on_change: string;
  log_change: string;
  log_level: string;
  log_text: string;
  log_mapping: string;
  log_rules: string;
  cycle: string;
  crontab: string;
  autotimer: string;
  threshold: string;
  threshold_crossed: string;
  config: {};
  logics: {
    name: string;
    description: string;
  }[];
  triggers: string;
  filename: string;
}

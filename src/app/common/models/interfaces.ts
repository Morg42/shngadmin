//
// PrimeNG
//
export interface TreeNode {
  data?: unknown;
  children?: TreeNode[];
  leaf?: boolean;
  expanded?: boolean;
}

export interface TableColumn {
  field: string;
  header: string;
  [key: string]: unknown;
}

export interface ConfigParameter {
  name: string;
  value: unknown;
  default?: unknown;
  type?: string;
  gui_type?: string;
  valid_list?: unknown[];
  description?: string;
  [key: string]: unknown;
}

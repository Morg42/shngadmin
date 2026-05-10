//
// PrimeNG
//
export interface TreeNode {
  data?: any;
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
  description?: string;
  [key: string]: unknown;
}

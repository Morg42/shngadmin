export interface ItemTreeNode {
  path: string;
  name: string;
  tags: number[];
  nodes: ItemTreeNode[];
}

export interface ItemTree {
  [index: number]: ItemTreeNode;
}

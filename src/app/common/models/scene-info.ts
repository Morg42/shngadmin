//
// Datatype for <shng-server>:<port>/api/scenes
//
export interface SceneValue {
  action_list: string[];
  action_name: string;
  action: string;
  [key: string]: unknown;
}

export interface SceneInfo {
  path: string;
  name: string;
  value_list: string[];
  scene_path: string[];
  values: SceneValue[];
}

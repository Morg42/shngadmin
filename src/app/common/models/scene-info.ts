//
// Datatype for <shng-server>:<port>/api/scenes
//
export interface SceneInfo {
  path: string;
  name: string;
  value_list: string[];
  scene_path: string[];
  values: {}[];
}

//
// Datatype for <shng-server>:<port>/admin/pypi.json
//
export interface PypiInfo {
  name: string;
  vers_installed: string;
  vers_color: string;
  is_required: boolean;
  is_required_for_plugins: boolean;
  is_required_for_testsuite: boolean;
  is_required_for_docbuild: boolean;
  required_group: number;
  vers_req_min: string;
  vers_req_max: string;
  vers_req_msg: string;
  vers_req_source: string;
  vers_ok: boolean;
  vers_recent: boolean;
  pypi_version: string;
  pypi_version_ok: boolean;
  pypi_version_not_available_msg: string;
  pypi_doc_url: string;
  sort: string;
}

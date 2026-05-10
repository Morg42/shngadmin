//
// Datatype for <shng-server>:<port>/api/logs
//

export interface LoggersType {
  [key: string]: any;
}

/*
export interface LoggersInfoDict {
  [key: string]: string[];
}


export interface LoggersType {
  logs: LoggersInfoDict;
  default: string;
}
*/

/*

  "knx_busmonitor": {
    "level": "INFO",
    "handlers": [
      "shng_busmonitor_file"
    ],
    "active": {
      "disabled": false,
      "level": "INFO",
      "filters": [],
      "handlers": [
        "TimedRotatingFileHandler"
      ],
      "logfiles": [
        "/usr/local/shng_dev/var/log/knx_busmonitor.log"
      ]
    }
  },

 */

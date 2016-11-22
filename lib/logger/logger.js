var bunyan = require('bunyan');

var log = {
  defaultLogger: function() {
    this.logger = bunyan.createLogger({
      name: 'fh-service-auth',
      streams:[ {
        level: 'debug',
        stream: process.stdout,
        src: true
      } ]
    });
  }
};

module.exports = log;

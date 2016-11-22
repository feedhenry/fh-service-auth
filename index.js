var log = require('./lib/logger/logger');
var config = require('./lib/config/config');
var model = require('./lib/models/service.js');

module.exports = {
  setConfig: config.setConfig,
  getConfig: config.getConfig,
  init: function(params, cb){
    if(params.logger){
      log.logger = params.logger;
    }

    cb ? cb() : null;
  },
  model: model
};
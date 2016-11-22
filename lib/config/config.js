
var _ = require('underscore');

var config;

function setConfig(cfg) {
  if(_.isObject(cfg)){
    config = cfg;
  }
}

function getConfig() {
  return config;
}

module.exports = {
  setConfig: setConfig,
  getConfig: getConfig
};

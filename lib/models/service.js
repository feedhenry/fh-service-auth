var mongoose = require('mongoose');
var Schema = require('mongoose').Schema;
var log = require('../logger/logger');
var _ = require('underscore');

var SERVICE_MODEL = "Service";

//Cached set of mongoose connections for domain databases. Removes the need to keep creating new ones when dealing with services.
var domainMongooseConnections = {};

var ServiceSchema = new Schema({
  guid: {
    type: String,
    required: true,
    unique: true
  },
  domain: {
    type: String,
    require: true
  },
  dataSources: [{type: Schema.Types.ObjectId, required: true}]
}, { strict: true,  versionKey: false  });

/**
 * Listing Data Sources Associated With A Service
 * @param params
 * @param cb
 */
ServiceSchema.statics.listDataSources = function (params, cb) {
  //Only want a single service
  this.findOneOrCreate({
    guid: params.guid,
    domain: params.domain
  }, function (err, service) {
    if (err) {
      log.logger.error("Error Finding Service ", {error: err});
    }

    var serviceJSON = service ? service.toJSON() : {};

    //Only interested in the array of data source IDs.
    return cb(err, serviceJSON.dataSources);
  });
};

ServiceSchema.statics.deploy = function(params, cb){
  this.findOneOrCreate({
    guid: params.guid,
    domain: params.domain
  }, function(err, serviceDetails){
    if(err){
      return cb(err);
    }

    serviceDetails.dataSources = params.service.dataSources || serviceDetails.dataSources;
    serviceDetails.markModified('dataSources');
    serviceDetails.save(cb);
  });
};

ServiceSchema.statics.findOneOrCreate = function(condition, doc, callback) {
  var self = this;

  if(typeof doc === "function"){
    callback = doc;
    doc = _.extend({}, condition);
  }

  self.findOne(condition, function(err, result ) {
    if(err){
      return callback(err);
    }
    if (result) {
      log.logger.debug("Found A Service ", result);
      return callback(err, result);
    } else {
      log.logger.debug("No Service ", result);
      var newDoc = new self(doc);

      newDoc.save(function(err) {
        if(err){
          //If the error code is a duplicate key, then the entry was already created
          //Just need to find it again
          if(err.code !== 11000){
            return callback(err);
          }
        }
        self.findOne(condition, callback);
      });
    }
  });
};


/**
 * Adding Data Sources To A Service
 * @param params
 * @param cb
 */
ServiceSchema.statics.updateDataSources = function (params, cb) {
  var self = this;
  log.logger.debug("updateDataSources: " , params);
  var dataSourceIds = params.dataSourceIds;
  dataSourceIds = _.map(dataSourceIds, function (dsID) {
    return dsID.toString();
  });

  self.findOneOrCreate({
    guid: params.guid,
    domain: params.domain
  }, function (err, service) {
    if (err) {
      log.logger.error("Error Finding Service", {params: params, error: err});
      return cb(err);
    }

    log.logger.debug("Found Service ", service);

    var dataSources = _.map(service.dataSources, function (dsID) {
      return dsID.toString();
    });

    //If adding a data source, just add it to the array
    if (params.addDataSource) {
      dataSources = _.uniq(_.union(dataSources, dataSourceIds));
    } else if (params.removeDataSources) { //Removing Data Source Associations From The Array.
      dataSources = _.difference(dataSources, dataSourceIds);
    } else {
      dataSources = dataSourceIds;
    }

    log.logger.debug("Updating Data Sources ",  {
      dataSourceIds: dataSourceIds,
      dataSources: dataSources
    });

    service.dataSources = dataSources;
    service.markModified('dataSources');
    service.save(function (err, savedService) {
      if (err) {
        log.logger.error("Error Saving Service ", {error: err});
        return cb(err);
      }

      log.logger.debug("Saved Service ", savedService);

      //Don't want objectIds
      dataSourceIds = _.map(savedService.toJSON().dataSources, function (dsID) {
        return dsID.toString();
      });

      return cb(undefined, dataSourceIds);
    });
  });
};

/**
 * Removing A Data Source From A Service
 * @param params
 * @param cb
 */
ServiceSchema.statics.removeDataSource = function (params, cb) {
  log.logger.debug("removeDataSource", params);
  params.removeDataSources = true;
  this.updateDataSources(params, cb);
};

/**
 * Creating A connection To The Domain Database If It Does Not Already Exist
 * @param connectionUrl - Full Mongo Connection String For A Domain Database
 * @returns {null}
 */
function initServiceModel(connectionUrl) {
  log.logger.debug("initServiceModel ", {connectionUrl: connectionUrl});
  if (!connectionUrl) {
    log.logger.error("No Connection Url Specified");
    return null;
  }

  //If the connection has not already been created, create it and initialise the Service Schema For That Domain
  if (!domainMongooseConnections[connectionUrl]) {
    log.logger.debug("No Connection Exists for " + connectionUrl + ", creating a new one");
    domainMongooseConnections[connectionUrl] = mongoose.createConnection(connectionUrl);
    domainMongooseConnections[connectionUrl].model(SERVICE_MODEL, ServiceSchema);

    //Setting Up Event Listeners
    domainMongooseConnections[connectionUrl].on('connecting', function(msg){
      log.logger.debug("Mongoose Connecting", {msg: msg, connectionUrl: connectionUrl});
    });

    domainMongooseConnections[connectionUrl].on('error', function(msg){
      log.logger.error("Mongoose Connection Error", {msg: msg, connectionUrl: connectionUrl});
    });

    domainMongooseConnections[connectionUrl].on('connected', function(msg){
      log.logger.debug("Mongoose Connected", {msg: msg, connectionUrl: connectionUrl});
    });
  } else {
    log.logger.debug("Connection Already Exists.");
  }

  return domainMongooseConnections[connectionUrl];
}

module.exports = {
  initServiceModel: initServiceModel,
  ServiceSchema: ServiceSchema,
  get: function (connectionUrl) {

    initServiceModel(connectionUrl);
    //Getting A Service Model Related To A Specific Connection Url
    log.logger.debug("Getting Service Model ", {connectionUrl: connectionUrl, domainMongooseConnections: domainMongooseConnections});
    if(domainMongooseConnections[connectionUrl]) {
      return domainMongooseConnections[connectionUrl].model(SERVICE_MODEL);
    } else {
      return null;
    }
  }
};
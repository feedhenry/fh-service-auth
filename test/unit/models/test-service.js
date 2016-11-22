var assert = require('assert');
var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
var _ = require('underscore');
var logger = require('../../../lib/logger/logger.js').defaultLogger();

var Service = require('models/service.js');
var testMongoUrl = "mongodb://some.mongo.url/somedomain";
var testDataSourceId1 = "560cea8727a265667f3a7322";
var testDataSourceId2 = "560cea8727a265667f3a7323";
var testServiceGuid = "someserviceguid";
var testDomain = "somedomain";

module.exports = {
  "before": function(done) {
    mockgoose(mongoose).then(function() {
      mongoose.connect(testMongoUrl, function(err) {
        done(err);
      });
    });
  },

  "beforeEach": function(done){
    mockgoose.reset();
    done();
  },
  "Test Init Service Model With The Same Url": function(done){
    //If initialising a service model with the same url, it should return a cached connection object if required.
    var mockMongoUrl = "mongodb://some.mongo.url/domain1";
    var mockMongoUrl2 = "mongodb://some.mongo.url/domain2";

    var connection1 = Service.initServiceModel(mockMongoUrl);
    var connection2 = Service.initServiceModel(mockMongoUrl);
    var differentConnetion = Service.initServiceModel(mockMongoUrl2);

    //The same url should produce the same connection object.
    assert.strictEqual(connection1, connection2);

    assert.notEqual(connection1, differentConnetion);

    done();
  },
  "Test Update Service Data Sources": function(done){
    var service = Service.get(testMongoUrl);

    service.updateDataSources({
      guid: testServiceGuid,
      domain: testDomain,
      dataSourceIds: [testDataSourceId1]
    }, function (err, updatedDataSourceList) {
      assert.ok(!err, "Expected No Error " + err);

      //Expected a list of data sources with one value.
      assert.equal(1, updatedDataSourceList.length);
      assert.equal(testDataSourceId1, updatedDataSourceList[0]);

      //Adding another Data Source should add it to the list.
      service.updateDataSources({
        guid: testServiceGuid,
        domain: testDomain,
        dataSourceIds: [testDataSourceId2],
        addDataSource: true
      }, function (err, updatedDataSourceList) {
        assert.ok(!err, "Expected No Error");

        assert.equal(2, updatedDataSourceList.length);
        assert.strictEqual(testDataSourceId1, updatedDataSourceList[0]);
        assert.strictEqual(testDataSourceId2, updatedDataSourceList[1]);

        //Not Adding A Data Source Should Reset The Data Source Collection
        service.updateDataSources({
          guid: testServiceGuid,
          domain: testDomain,
          dataSourceIds: [testDataSourceId2]
        }, function (err, updatedDataSourceList) {
          assert.ok(!err, "Expected No Error");

          assert.equal(1, updatedDataSourceList.length);
          assert.equal(testDataSourceId2, updatedDataSourceList[0]);
          done();
        });
      });
    });
  },
  "Test Remove Data Sources From A Service": function(done){
    var service = Service.get(testMongoUrl);

    service.updateDataSources({
      guid: testServiceGuid,
      domain: testDomain,
      dataSourceIds: [testDataSourceId1]
    }, function (err, updatedDataSourceList) {
      assert.ok(!err, "Expected No Error");

      //Expected a list of data sources with one value.
      assert.equal(1, updatedDataSourceList.length);
      assert.equal(testDataSourceId1, updatedDataSourceList[0]);

      service.removeDataSource({
        guid: testServiceGuid,
        domain: testDomain,
        dataSourceIds: [testDataSourceId1]
      }, function (err, updatedDataSourceList) {
        assert.ok(!err, "Expected No Error");

        assert.equal(0, updatedDataSourceList.length);
        done();
      });
    });
  }
};
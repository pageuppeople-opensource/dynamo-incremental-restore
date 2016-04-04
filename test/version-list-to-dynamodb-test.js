'use strict';

var should = require('should');
var sinon = require('sinon');
var aws = require('aws-sdk');;
var testData = require('./versionlist-test-data.json');

var TableName = 'TestTable'

describe('S3 Versions to DynamoDb', function() {

    var dynamoIncrementalRestore = require('../');

    var batchWriteItemStub;
    var callCount;
    before(function() {
        batchWriteItemStub = sinon.stub().yields();
        var describeTable = sinon.stub().withArgs({ TableName: TableName }).yields([undefined, {
            Table: {
                KeySchema: [{
                    AttributeName: 'FormInstanceId',
                    KeyType: 'HASH'
                }, {
                    AttributeName: 'InstanceId',
                    KeyType: 'RANGE'
                }],
                TableName: TableName,
                TableStatus: 'ACTIVE'
            }
        }]);

        sinon.stub(aws, 'DynamoDB', function() {
            return {
                batchWriteItem: batchWriteItemStub,
                describeTable: describeTable
            }
        });

        sinon.stub(aws, 'S3', function() {
            return {
                getObject: function(params) {
                    return {
                        on: function(x, data) { // data
                            return {
                                on: function(x, done) { // done
                                    return {
                                        send: function() {
                                            var row = '{"FormInstanceId":{"S":"01623c09-574d-4bec-8d46-a5d900048b44"},"InstanceId":{"N":"683"}}';
                                            data(row);
                                            done();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };
        });
    });

    after(function() {
        aws.DynamoDB.restore();
        aws.S3.restore();
    });

    describe('Given a list of versions', function() {

        var promise;
        before(function() {
            promise = dynamoIncrementalRestore.pushToDynamo({}, testData);
        });

        describe('Row Updates (create, update)', function() {
            it('Should execute three row updates', function(done) {
                promise.then(function(data) {
                    var updateCount = 0;
                    for (var i = 0; i < 4; i++) {
                        if (batchWriteItemStub.getCall(i).args[0].RequestItems[TableName][0].PutRequest) {
                            updateCount++;
                        }
                    }
                    updateCount.should.equal(3);
                    done();
                }).catch(function(err) {
                    console.error(err);
                });;
            });
        });

        describe('Row deletes', function() {
            var deleteRequests = [];

            before(function() {
                promise.then(function(data) {
                    for (var i = 0; i < 4; i++) {
                        if (batchWriteItemStub.getCall(i).args[0].RequestItems[TableName][0].DeleteRequest) {
                            deleteRequests.push(batchWriteItemStub.getCall(i).args[0].RequestItems[TableName][0].DeleteRequest);
                        }
                    }
                }).catch(function(err) {
                    console.error(err);
                });;
            });

            it('Should execute one row deletion', function(done) {
                promise.then(function(data) {
                    deleteRequests.length.should.equal(1);
                    done();
                });
            });

            it('Should contain correct keys in delete request', function(done) {
                promise.then(function(data) {
                    should.exist(deleteRequests[0].Key.FormInstanceId.S);
                    should.exist(deleteRequests[0].Key.InstanceId.N);
                    done();
                }).catch(function(err) {
                    console.error(err);
                });
            });

        });

    });

});

'use strict';

// var mockery = require('mockery');
var should = require('should');
var sinon = require('sinon');
var aws = require('aws-sdk');;
var testData = require('./versionlist-test-data.json');

describe('S3 Versions to DynamoDb', function() {

    var dynamoIncrementalRestore = require('../');

    var batchWriteItemStub;
    var callCount;
    before(function() {
        batchWriteItemStub = sinon.stub().yields();
        sinon.stub(aws, 'DynamoDB', function() {
            return {
                batchWriteItem: batchWriteItemStub
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
                                            data(params.Key + 'DATA');
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

        it('Should execute four dynamodb calls', function(done) {
            promise.then(function(data) {
                batchWriteItemStub.callCount.should.equal(4);
                console.log();
                done();
            });
        });

        it('Should execute three row updates', function(done) {
            promise.then(function(data) {
                var updateCount = 0;
                for (var i = 0; i < 4; i++) {
                    if (batchWriteItemStub.getCall(i).args[0].RequestItems.TestTable[0].PutRequest) {
                        updateCount++;
                    }
                }
                updateCount.should.equal(3);
                done();
            });
        });

        it('Should execute one row deletion', function(done) {
            promise.then(function(data) {
                var deleteCount = 0;
                for (var i = 0; i < 4; i++) {
                    if (batchWriteItemStub.getCall(i).args[0].RequestItems.TestTable[0].DeleteRequest) {
                        deleteCount++;
                    }
                }
                deleteCount.should.equal(1);
                done();
            });
        });

    });

});

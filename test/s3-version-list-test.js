'use strict';

// var mockery = require('mockery');
var should = require('should');
var sinon = require('sinon');
var aws = require('aws-sdk');

describe('Build Version List from S3 Incremental Backups', function() {

    var dynamoIncrementalRestore = require('../');
    var testData;

    before(function() {        
        testData = require('./s3-test-data.json');

        // mockery.enable();
        sinon.stub(aws, 'S3', function() {
            return {
                listObjectVersions: function(params, cb) {
                    var data = JSON.parse(JSON.stringify(testData));
                    cb(false, data);
                }
            };
        });

        // sinon.mock(aws.DynamoDb, function() {
        //     return {
        //         batchWriteItem: function(params, cb) {
        //             cb();
        //         }
        //     };
        // });

        // mockery.registerMock('aws-sdk', aws);
    });

    after(function() {
        // mockery.disable();
        aws.S3.restore();
    });

    describe('Latest version restore', function() {

        var promise;
        before(function() {
            promise = dynamoIncrementalRestore.buildList({});
        });

        it('Should execute three documents', function(done) {
            promise
                .then(function(data) {
                    Object.keys(data).should.have.length(4);
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });

        it('Should execute the correct documents', function(done) {
            promise
                .then(function(data) {
                    data.should.have.properties('originalRecord');
                    data.should.have.properties('updatedRecord');
                    data.should.have.properties('restoredRecord');
                    data.should.have.properties('deletedRecord');
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });

    });

    describe('Point in time restore', function() {

        describe('Deleted Record', function() {
            it('Should delete \'deletedRecord\' row after it was deleted', function(done) {
                var pointInTime = new Date("2016-03-29T23:56:55.000Z");
                dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime })
                    .then(function(data) {
                        data.should.have.properties('deletedRecord');
                        data['deletedRecord'].deletedMarker.should.be.true;
                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });

            it('Should create \'deletedRecord\' row after it was created, but before it is deleted', function(done) {
                var pointInTime = new Date("2016-03-28T23:56:40.000Z");
                dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime })
                    .then(function(data) {
                        data.should.have.properties('deletedRecord');
                        should.not.exist(data['deletedRecord'].deletedMarker);
                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });
        });

        describe('Restored Record', function() {
            it('Should recreate \'restoredRecord\' row after it was recreated', function(done) {
                var pointInTime = new Date("2016-04-01T23:51:01.000Z");
                dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime })
                    .then(function(data) {
                        data.should.have.properties('restoredRecord');
                        data['restoredRecord'].VersionId.should.equal('2Zf.8YkRap26dnjmW58qB4jxCVcRhnSJ');
                        should.not.exist(data['restoredRecord'].deletedMarker);

                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });
        });

        describe('Original Record', function() {
            it('Should delete \'originalRecord\' before it existed', function(done) {
                var pointInTime = new Date("2016-03-20T23:51:02.000Z");
                dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime })
                    .then(function(data) {
                        data.should.have.properties('originalRecord');
                        data['originalRecord'].deletedMarker.should.be.true;
                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });

            it('Should create \'originalRecord\' row after it was created', function(done) {
                var pointInTime = new Date("2016-04-01T23:51:02.000Z");
                dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime })
                    .then(function(data) {
                        data.should.have.properties('originalRecord');
                        should.not.exist(data['originalRecord'].deletedMarker);
                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });
        });

        describe('Updated Record', function() {
            it('Should update row \'updatedRecord\' with correct version after it was updated', function(done) {
                var pointInTime = new Date("2016-04-01T23:52:15.000Z");
                dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime })
                    .then(function(data) {
                        data.should.have.properties('updatedRecord');
                        data['updatedRecord'].VersionId.should.equal('JDA8H6b28hd7rVNZTTh0O1UoLqiPMuht');
                        should.not.exist(data['updatedRecord'].deletedMarker);

                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });
        });
    });

});

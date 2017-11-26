'use strict';

// var mockery = require('mockery');
var should = require('should');
var sinon = require('sinon');
var aws = require('aws-sdk');
var testDataFirst = require('./s3-test-data-1.json');
var testDataSecond = require('./s3-test-data-2.json');

describe('Build Version List from S3 Incremental Backups', function() {

    var dynamoIncrementalRestore = require('../');
    var listObjectVersionsStub;
    var firstCallData, secondCallData;

    before(function() {
        firstCallData = function() {
            return JSON.parse(JSON.stringify(testDataFirst));
        }
        secondCallData = function() {
            return JSON.parse(JSON.stringify(testDataSecond));
        }

        listObjectVersionsStub = sinon.stub();
        listObjectVersionsStub.onFirstCall().yields(false, firstCallData());
        listObjectVersionsStub.onSecondCall().yields(false, secondCallData());
        listObjectVersionsStub.yields('Should not call listObjectVersion three times!');
        sinon.stub(aws, 'S3', function() {
            return {
                listObjectVersions: listObjectVersionsStub
            };
        });
    });

    after(function() {
        aws.S3.restore();
    });

    beforeEach(function() {
        listObjectVersionsStub.reset();
        listObjectVersionsStub.onFirstCall().yields(false, firstCallData());
        listObjectVersionsStub.onSecondCall().yields(false, secondCallData());
    });

    describe('Full database restore mode', function() {

        describe('Latest version restore', function() {

            var promise;
            before(function() {
                promise = dynamoIncrementalRestore.buildList({ runDelta: false });
            });

            it('Should execute three documents', function(done) {
                promise
                    .then(function(data) {
                        Object.keys(data).should.have.length(4);
                        done();
                    })
                    .catch(function(err) {
                        console.error(err);
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
                        console.error(err);
                    });
            });
        });

        describe('Point in time restore', function() {

            describe('Deleted Record', function() {
                it('Should delete \'deletedRecord\' row after it was deleted', function(done) {
                    var pointInTime = new Date("2016-03-29T23:56:55.000Z");
                    dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime, runDelta: false })
                        .then(function(data) {
                            data.should.have.properties('deletedRecord');
                            data['deletedRecord'].deletedMarker.should.be.true;
                            done();
                        })
                        .catch(function(err) {
                            console.error(err);
                        });
                });

                it('Should create \'deletedRecord\' row after it was created, but before it is deleted', function(done) {
                    var pointInTime = new Date("2016-03-28T23:56:40.000Z");
                    dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime, runDelta: false })
                        .then(function(data) {
                            data.should.have.properties('deletedRecord');
                            should.not.exist(data['deletedRecord'].deletedMarker);
                            done();
                        })
                        .catch(function(err) {
                            console.error(err);
                        });
                });

                it('Should have existingVersionId for \'deletedRecord\' when being deleted', function(done) {
                    var pointInTime = new Date("2016-03-29T23:56:55.000Z");
                    dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime, runDelta: false })
                        .then(function(data) {
                            data.should.have.properties('deletedRecord');
                            data['deletedRecord'].deletedMarker.should.be.true;
                            should.not.exist(data['deletedRecord'].Size);
                            console.log(data['deletedRecord']);
                            should.exist(data['deletedRecord'].existingVersionId, 'existingVersionId property does not exist on records to be deleted.');
                            done();
                        })
                        .catch(function(err) {
                            console.error(err);
                        });
                });
            });

            describe('Restored Record', function() {
                it('Should recreate \'restoredRecord\' row after it was recreated', function(done) {
                    var pointInTime = new Date("2016-04-01T23:51:01.000Z");
                    dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime, runDelta: false })
                        .then(function(data) {
                            data.should.have.properties('restoredRecord');
                            data['restoredRecord'].VersionId.should.equal('2Zf.8YkRap26dnjmW58qB4jxCVcRhnSJ');
                            should.not.exist(data['restoredRecord'].deletedMarker);

                            done();
                        })
                        .catch(function(err) {
                            console.error(err);
                        });
                });
            });

            describe('Original Record', function() {

                it('Should delete \'originalRecord\' before it existed', function(done) {
                    var pointInTime = new Date("2016-03-20T23:51:02.000Z");
                    dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime, runDelta: false })
                        .then(function(data) {
                            data.should.have.properties('originalRecord');
                            data['originalRecord'].deletedMarker.should.be.true;
                            should.exist(data['originalRecord'].Size);
                            // should.exist(data['originalRecord'].existingVersionId, 'existingVersionId property does not exist on records to be deleted.');
                            done();
                        })
                        .catch(function(err) {
                            console.error(err);
                        });
                });

                it('Should create \'originalRecord\' row after it was created', function(done) {
                    var pointInTime = new Date("2016-04-01T23:51:02.000Z");
                    dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime, runDelta: false })
                        .then(function(data) {
                            data.should.have.properties('originalRecord');
                            should.not.exist(data['originalRecord'].deletedMarker);
                            done();
                        })
                        .catch(function(err) {
                            console.error(err);
                        });
                });
            });

            describe('Updated Record', function() {
                it('Should update row \'updatedRecord\' with correct version after it was updated', function(done) {
                    var pointInTime = new Date("2016-04-01T23:52:15.000Z");
                    dynamoIncrementalRestore.buildList({ restoreToPointInTime: pointInTime, runDelta: false })
                        .then(function(data) {
                            data.should.have.properties('updatedRecord');
                            data['updatedRecord'].VersionId.should.equal('JDA8H6b28hd7rVNZTTh0O1UoLqiPMuht');
                            should.not.exist(data['updatedRecord'].deletedMarker);
                            done();
                        })
                        .catch(function(err) {
                            console.error(err);
                        });
                });
            });
        });

        describe('Error', function() {
            it('Error retrieving S3 object versions should reject promise', function(done) {
                listObjectVersionsStub.onFirstCall().yields('Error');
                var promise = dynamoIncrementalRestore.buildList({ runDelta: false });
                promise.then(function(data) {
                    should.not.exist('Promise should have been rejected.');
                    done();
                }, function(err) {
                    should.exist(err);
                    // should.not.exist('Promies should have been rejected.');
                    done();
                }).catch(function(err) {
                    should.not.exist('Promies should have been rejected.');
                    done();
                });
            });
        });
    });



});

'use strict';

var mockery = require('mockery');
var assert = require('should');
var sinon = require('sinon');

describe('DynamoDb Incremental backups restore', function() {

    var dynamoIncrementalRestore = require('../');
    before(function() {
        var aws = require('aws-sdk');
        var awsMock = require('./aws-mock.js');
        var testData = require('./test-data.json');

        mockery.enable();
        sinon.stub(aws, 'S3', function() {
            return {
                listObjectVersions: function(params, cb) {
                    cb(false, testData);
                }
            };
        });

        mockery.registerMock('aws-sdk', aws);
    });

    after(function() {
        mockery.disable();
    });

    describe('Latest version restore', function() {

        var promise;
        before(function() {
            promise = dynamoIncrementalRestore();
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

        it('Should execute ')

    });

});

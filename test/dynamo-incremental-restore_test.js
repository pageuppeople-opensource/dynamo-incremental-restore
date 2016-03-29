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

        it('Execute latest version against DynamoDb', function(done) {
            dynamoIncrementalRestore()
                .then(function(data) {
                    data.should.have.length(3);
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });

    });

    describe('Point in time restore', function() {


    });

});

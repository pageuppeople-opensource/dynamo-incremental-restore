'use strict';

var mockery = require('mockery');
var should = require('should');
var sinon = require('sinon');

describe('S3 Versions to DynamoDb', function() {

    var dynamoIncrementalRestore = require('../');
    var testData = require('./versionlist-test-data.json');

    describe('Given a list of versions', function() {

        var promise;
        before(function() {
            promise = dynamoIncrementalRestore.pushToDynamo({}, testData);
        });

        it('Should execute row updates', function(done) {
            done();
        });

        it('Should execute row deletion', function(done) {
            done();
        });

    });

});

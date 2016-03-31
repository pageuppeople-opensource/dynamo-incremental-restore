// 'use strict';

// var mockery = require('mockery');
// var should = require('should');
// var sinon = require('sinon');

// describe('S3 Versions to DynamoDb', function() {

//     var dynamoIncrementalRestore = require('../');
//     var testData;
//     before(function() {
//         var aws = require('aws-sdk');
//         testData = require('./s3-test-data.json');

//         mockery.enable();
//         sinon.stub(aws, 'S3', function() {
//             return {
//                 listObjectVersions: function(params, cb) {
//                     var data = JSON.parse(JSON.stringify(testData));
//                     cb(false, data);
//                 }
//             };
//         });

//         mockery.registerMock('aws-sdk', aws);
//     });

//     after(function() {
//         mockery.disable();
//     });

//     describe('Given a list of versions', function() {

//         var promise;
//         before(function() {
//             promise = dynamoIncrementalRestore.pushToDynamo({}, []);
//         });

//         it('Should execute row updates', function(done) {

//         });

//         it('Should execute row deletion', function(done) {

//         });

//     });

// });

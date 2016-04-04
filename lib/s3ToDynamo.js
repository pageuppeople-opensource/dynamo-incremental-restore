'use strict';

// var s3scan = require('s3scan');
// var stream = require('stream');
var AWS = require('aws-sdk');
var q = require('q');

module.exports = s3ToDynamoDb;

var TableName = 'TestTable';

function s3ToDynamoDb(params, versionList) {

    var s3, bucket, dynamoDb;

    function processVersion(version) {
        var deferred = q.defer();

        retrieveFromS3(version)
            .then(pushToDynamoDb)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    }

    function retrieveFromS3(version) {
        var params = { Bucket: bucket, Key: version.Key, VersionId: version.VersionId };

        var deferred = q.defer();
        var data = '';
        s3
            .getObject(params)
            .on('httpData', function(chunk) { data += chunk; })
            .on('httpDone', function() { deferred.resolve([version, JSON.parse(data)]); })
            .send();
        return deferred.promise;
    }

    function pushToDynamoDb(data) {
        var deferred = q.defer();
        var version = data[0];
        var fileContents = data[1];
        
        var dParams = { RequestItems: {} };
        dParams.RequestItems[TableName] = [];

        if (!version.deletedMarker) {
            var action = {
                PutRequest: {
                    Item: fileContents
                }
            };
            dParams.RequestItems[TableName].push(action);
        } else {
            var action = {
                DeleteRequest: {
                    Key: fileContents
                }
            };
            dParams.RequestItems[TableName].push(action);
        }

        dynamoDb.batchWriteItem(dParams, function(err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(data);
            }
        });
        return deferred.promise;
    }

    function _init() {
        s3 = new AWS.S3();
        dynamoDb = new AWS.DynamoDB();

        bucket = params.bucket || '';

        var deferred = q.defer();
        var promises = [];
        Object.keys(versionList).forEach(function(key, index) {
            promises.push(processVersion(versionList[key]));
        });

        q.all(promises)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    }

    return _init();
}

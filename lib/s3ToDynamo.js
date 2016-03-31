'use strict';

// var s3scan = require('s3scan');
// var stream = require('stream');
var AWS = require('aws-sdk');
var q = require('q');

module.exports = s3ToDynamoDb;

function s3ToDynamoDb(params, versionList) {

    var s3, bucket;

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
        var data;
        s3
            .getObject(params)
            .on('httpData', function(chunk) { data += chunk; })
            .on('httpDone', function() { deferred.resolve(data); })
            .send();
        return deferred.promise;
    }

    function pushToDynamoDb(data) {
        var deferred = q.defer();

        var config = {
            region: options.region,
            endpoint: options.endpoint,
            params: { TableName: options.table }, // Sets `TableName` in every request
            httpOptions: options.httpOptions || { timeout: 5000 }, // Default appears to be 2 min
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey,
            sessionToken: options.sessionToken,
            logger: options.logger,
            maxRetries: options.maxRetries
        };

        var client = new AWS.DynamoDB(config);

        deferred.resolve();
        return deferred.promise;
    }

    function _init() {
        s3 = new AWS.S3();
        bucket = params.bucket || '';

        var deferred = q.defer();
        var promises = [];

        Object.keys(versionList).forEach(function (key, index) {
            promises.push(processVersion(versionList[key]));
        });

        q.all(promises)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    }

    return _init();
}

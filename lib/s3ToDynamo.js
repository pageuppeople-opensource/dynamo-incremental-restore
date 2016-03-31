'use strict';

// var s3scan = require('s3scan');
// var stream = require('stream');
var AWS = require('aws-sdk');
var q = require('q');

exports.module = s3ToDynamoDb;

function s3ToDynamoDb(params, versionList) {

    function processVersion(version) {
        var deferred = q.deferred();
        retrieveFromS3(version)
            .then(pushToDynamoDb)
            .then(deferred.resolve)
            .catch(deferred.reject);
        return deferred.promise;
    }

    function retrieveFromS3(version) {
    	var params = { Bucket: bucket, Key: version.Key, VersionId: version.VersionId };

        var deferred = q.deferred();
        var data;
        s3
            .getObject(params)
            .on('httpData', function(chunk) { data += chunk; })
            .on('httpDone', function() { deferred.resolve(data); })
            .send();
        return deferred.promise;
    }

    function pushToDynamoDb(data) {
        var deferred = q.deferred();

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

    var s3 = new AWS.S3();
    var bucket = params.bucket || '';
    
    var deferred = q.deferred();
    var promises = [];

    versionList.forEach(function(version) { promises.push(processVersion(version)); });
    q
        .all(promises)
        .then(deferred.resolve)
        .catch(deferred.reject);

    return deferred.promise;

}

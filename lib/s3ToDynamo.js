'use strict';

var AWS = require('aws-sdk');
var q = require('q');
var async = require('async');

module.exports = s3ToDynamoDb;

function s3ToDynamoDb(params, versionList) {

    var s3, dynamoDb;
    var s3Bucket, destTableName;
    var destTableKeys;

    function processVersion(version) {
        var deferred = q.defer();

        retrieveFromS3(version)
            .then(pushToDynamoDb)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    }

    function retrieveFromS3(version) {
        var s3Params = { Bucket: s3Bucket, Key: version.Key, VersionId: version.VersionId };
        if (version.existingVersionId)
            s3Params.VersionId = version.existingVersionId

        var deferred = q.defer();
        var data = '';
        console.time('RFS3' + version.Key);
        s3
            .getObject(s3Params)
            .on('httpData', function(chunk) { data += chunk; })
            .on('httpDone', function() {
                console.timeEnd('RFS3' + version.Key);
                try {
                    deferred.resolve([version, JSON.parse(data)]);
                } catch (e) {
                    deferred.reject('Failed to retrieve file from S3 - Params: ' + JSON.stringify(s3Params));
                }
            })
            .send();
        return deferred.promise;
    }

    function pushToDynamoDb(data) {
        var deferred = q.defer();
        var version = data[0];
        var fileContents = data[1];

        var dParams = { RequestItems: {} };
        dParams.RequestItems[destTableName] = [];

        if (!version.deletedMarker) {
            var action = {
                PutRequest: {
                    Item: fileContents
                }
            };
            dParams.RequestItems[destTableName].push(action);
        } else {
            var action = {
                DeleteRequest: {
                    Key: {}
                }
            };
            destTableKeys.forEach(function(key) {
                action.DeleteRequest.Key[key.AttributeName] = fileContents[key.AttributeName];
            });

            dParams.RequestItems[destTableName].push(action);
        }
        console.time('P2D' + version.Key);
        dynamoDb.batchWriteItem(dParams, function(err, data) {
            console.timeEnd('P2D' + version.Key);
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    function getKeysForDestinationTable() {
        var deferred = q.defer();
        dynamoDb.describeTable({ TableName: destTableName }, function(err, data) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve(data.Table.KeySchema);
        });
        return deferred.promise;
    }

    function _init() {
        function error(error) {
            console.log(error);
            deferred.reject(error)
        }

        s3 = new AWS.S3();
        dynamoDb = new AWS.DynamoDB(params);

        s3Bucket = params.bucket || '';
        destTableName = params.destinationTableName || '';

        var deferred = q.defer();
        var promises = [];

        getKeysForDestinationTable().then(function(keys) {
                destTableKeys = keys;

                Object.keys(versionList).forEach(function(key, index) {
                    promises.push(processVersion(versionList[key]));
                });

                q.all(promises)
                    .then(deferred.resolve)
                    .catch(deferred.reject);
            }, error)
            .catch(error);


        return deferred.promise;
    }

    return _init();
}

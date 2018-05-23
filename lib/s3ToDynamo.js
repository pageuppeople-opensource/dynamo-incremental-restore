'use strict';

var AWS = require('aws-sdk');
var q = require('q');
var async = require('async');
var fs = require('fs');
var _cliProgress = require('cli-progress');

module.exports = s3ToDynamoDb;

function s3ToDynamoDb(params, versionList) {

    var s3, dynamoDb;
    var s3Bucket, destTableName, endpoint;
    var destTableKeys;
    var completedKeys;

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
        //console.time('RFS3' + version.Key);
        s3
            .getObject(s3Params)
            .on('httpData', function(chunk) { data += chunk; })
            .on('httpDone', function() {
                //console.timeEnd('RFS3' + version.Key);
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
        //console.time('P2D' + version.Key);
        dynamoDb.batchWriteItem(dParams, function(err, data) {
            //console.timeEnd('P2D' + version.Key);
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

    function readLargeFile(cachedFilteredVersionListFileName) {
        var deferred = q.defer();
        fs.readFile(cachedFilteredVersionListFileName, 'utf8', function(err, data) {
            if (err) deferred.reject(err);
            deferred.resolve(JSON.parse(data));
        });
        return deferred.promise;
    }

    function readCompletedFile(cachedFilteredVersionListFileName) {
        var deferred = q.defer();
        fs.readFile(cachedFilteredVersionListFileName, 'utf8', function(err, data) {
            if (err) deferred.resolve([]);
            if (!data) deferred.resolve([]);
            else deferred.resolve(JSON.parse(data));
        });
        return deferred.promise;
    }

    function completeKey(key) {
        if (key) 
            completedKeys.push(key);

        if ((completedKeys.length % 1000 === 0) || (!key)) {
            var stream = fs.createWriteStream(params.filterCachedVersionList + '.restored');
            stream.once('open', function(fd) {
              stream.write(JSON.stringify(completedKeys));
              stream.end();
            });
        }
    }

    function _init() {
        function error(error) {
            console.log(error);
            deferred.reject(error)
        }

        s3 = new AWS.S3({signatureVersion: 'v4'});
        console.log(params);
        params['signatureVersion'] = 'v4';
        dynamoDb = new AWS.DynamoDB(params);

        s3Bucket = params.bucket || '';
        destTableName = params.destinationTableName || '';

        var deferred = q.defer();
        var promises = [];

        if (params.filterCachedVersionList) {
            readCompletedFile(params.filterCachedVersionList + '.restored')
                .then(function(data) {
                    completedKeys = data;

                    readLargeFile(params.filterCachedVersionList)
                        .then(function(data) {
                            versionList = data;
                            
                            getKeysForDestinationTable().then(function(keys) {
                                destTableKeys = keys;
        
                                const bar1 = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic);

                                var work = [];
                                var iteration = 0;

                                Object.keys(versionList).forEach(function(key, index) {
                                    if (!completedKeys.includes(key)) {
                                        work.push(function(callback) { 
                                            processVersion(versionList[key])
                                                .then(function(data) {
                                                    bar1.update(++iteration);
                                                    completeKey(key);
                                                    callback(null, data);
                                                })
                                                .catch(function(err) {
                                                    callback(err);
                                                });
                                        });
                                    }
                                });
                                
                                bar1.start(work.length, 0);

                                async.parallelLimit(work, 25, function(err, results) {
                                    completeKey();
                                    bar1.stop();
                                    if (err) {
                                        console.log('Error');
                                        console.log(err);
                                        deferred.reject(err);
                                    } else {
                                        console.log('Success!');                                        
                                        deferred.resolve();
                                    }
                                });
        
                            }, error)
                            .catch(error);
                        });
                });
        }
        else {
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
        }

        return deferred.promise;
    }

    return _init();
}

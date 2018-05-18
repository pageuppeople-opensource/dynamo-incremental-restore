'use strict';

var AWS = require('aws-sdk');
var q = require('q');
var fs = require('fs');

module.exports = getVersion;

function getVersion(params) {

    var s3, restoreToPointInTime;
    var s3Params = {};
    var runDeltaOnly;
    var cachedVersionList;

    function getAllObjectVersionsFromS3(params) {
        var deferred = q.defer();
        var s3DataContents = [];

        function recursiveCall(params) {
            s3.listObjectVersions(params, function(err, data) {
                if (err) {
                    deferred.reject('Failed to retrieve object versions from S3: ' + err);
                } else {
                    var contents = data;
                    s3DataContents = s3DataContents.concat(contents.Versions);

                    contents.DeleteMarkers.forEach(function(marker) {
                        marker.deletedMarker = true;
                    });

                    s3DataContents = s3DataContents.concat(contents.DeleteMarkers);
                    if (data.IsTruncated) {
                        params.VersionIdMarker = contents.NextVersionIdMarker;
                        params.KeyMarker = contents.NextKeyMarker;
                        recursiveCall(params);
                    } else {
                        deferred.resolve(s3DataContents);
                    }
                }
            });
        }
        recursiveCall(params);
        return deferred.promise;
    }

    function buildVersionListForRowsCreatedBeforeGivenPointInTime(allObjectVersions) {

        function filterOutModificationsAfterPointInTime(versions) {
            return versions.filter(function(version) {
                var diff = restoreToPointInTime - new Date(version.LastModified);
                return (diff >= 0) ? true : false;
            });
        }

        var filteredData = filterOutModificationsAfterPointInTime(allObjectVersions);
        var newData = {};

        filteredData.forEach(function(data) {
            if ((!(data.Key in newData)) || ((new Date(newData[data.Key].LastModified) - new Date(data.LastModified)) < 0)) {
                newData[data.Key] = data;
            }
        });
        return q.when(newData);
    }

    function buildVersionListForRowsCreatedAfterGivenPointInTime(versionList, allObjectVersions) {
        allObjectVersions.forEach(function(data) {
            var diff = restoreToPointInTime - new Date(data.LastModified);
            if ((diff < 0) && (!(data.Key in versionList))) {
                versionList[data.Key] = data;
                versionList[data.Key].deletedMarker = true;
            }
        });
        return q.when(versionList);
    }

    function hydrateExistingVersionIdForAllDeletedRecords(versionList, allObjectVersions) {
        function filterObject(obj, predicate) {
            var result = {},
                key;

            for (key in obj) {
                if (obj.hasOwnProperty(key) && predicate(obj[key])) {
                    result[key] = obj[key];
                }
            }

            return result;
        };
        var deletedRecords = filterObject(versionList, function(data) {
            return data.deletedMarker && !data.Size;
        });

        Object.keys(deletedRecords).forEach(function(key) {
            var data = deletedRecords[key];
            var existingVersions = filterObject(allObjectVersions, function(version) {
                return ((version.Key === data.Key) && (version.Size));
            });
            var keys = Object.keys(existingVersions);
            if (existingVersions && keys.length > 0) {
                data.existingVersionId = existingVersions[keys[0]].VersionId;
            }
        });

        return q.when(versionList);
    }

    function buildVersionListForUpdates(allObjectVersions) {
        var deferred = q.defer();
        buildVersionListForRowsCreatedBeforeGivenPointInTime(allObjectVersions)
            .then(function(versionList) {
                return buildVersionListForRowsCreatedAfterGivenPointInTime(versionList, allObjectVersions);
            })
            .then(function(versionList) {
                return hydrateExistingVersionIdForAllDeletedRecords(versionList, allObjectVersions)
            })
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    }

    function readLargeFile(cachedVersionListFileName) {
        var deferred = q.defer();
        fs.readFile(cachedVersionListFileName, 'utf8', function(err, data) {
            if (err) deferred.reject(err);
            deferred.resolve(JSON.parse(data).Versions);
        });
        return deferred.promise;
    }

    function writeLargeFile(outputVersionList) {
        var deferred = q.defer();
        var json = JSON.stringify(outputVersionList);
        fs.writeFile(params.cachedVersionListFileName + '.fout', json, 'utf8', function(err, data) {
            if (err) deferred.reject(err);
            deferred.resolve(outputVersionList);
        });
        return deferred.promise;
    }

    function _init() {
        if (params) {
            if (params.restoreToPointInTime)
                restoreToPointInTime = new Date(params.restoreToPointInTime);
            else
                restoreToPointInTime = new Date();
            s3Params.Bucket = params.Bucket || '';
            s3Params.Prefix = params.Prefix || '';
            runDeltaOnly = params.runDelta || false;
        }

        s3 = new AWS.S3({signatureVersion: 'v4'});

        var deferred = q.defer();

        if (params && params.cachedVersionListFileName) {
            readLargeFile(params.cachedVersionListFileName)
                .then(buildVersionListForUpdates)
                .then(writeLargeFile)
                .then(deferred.resolve)
                .catch(deferred.reject);
        }
        else {
            getAllObjectVersionsFromS3(s3Params)
                .then(buildVersionListForUpdates)
                .then(deferred.resolve)
                .catch(deferred.reject);
        }

        return deferred.promise;
    }

    return _init();
}

// For Delta Run
// For creates / updates
// Find the latest before the given point

// For deletes
// Find ones that are created after the given point

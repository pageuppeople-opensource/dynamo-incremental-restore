'use strict';

var AWS = require('aws-sdk');
var q = require('q');

module.exports = getVersion;

function getVersion(params) {

    var s3, restoreToPointInTime;
    var s3Params = {};
    var runDeltaOnly;

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
                        s3DataContents.concat(marker);
                    });

                    s3DataContents = s3DataContents.concat(contents.DeleteMarkers);
                    if (data.IsTruncated) {
                        params.VersionIdMarker = contents.NextVersionIdMarker;
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

    function _init() {
        if (params) {
            restoreToPointInTime = new Date(params.restoreToPointInTime) || new Date();
            s3Params.Bucket = params.Bucket || '';
            s3Params.Prefix = params.Prefix || '';
            runDeltaOnly = params.runDelta || false;
        }

        s3 = new AWS.S3();

        var deferred = q.defer();

        getAllObjectVersionsFromS3(s3Params)
            .then(buildVersionListForUpdates)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    }

    return _init();
}

// For Delta Run
// For creates / updates
// Find the latest before the given point

// For deletes
// Find ones that are created after the given point

'use strict';

// var s3scan = require('s3scan');
// var stream = require('stream');
var AWS = require('aws-sdk');
var q = require('q');

module.exports = getVersion;

function getVersion(params) {

    var s3, restoreToPointInTime;
    var s3Params = {};    

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

        function filterData(versions) {
            return versions.filter(function(version) {
                var diff = restoreToPointInTime - new Date(version.LastModified);
                return (diff >= 0) ? true : false;
            });
        }

        var filteredData = filterData(allObjectVersions);
        var newData = [];

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

    function buildVersionListForUpdates(allObjectVersions) {
        var deferred = q.defer();
        buildVersionListForRowsCreatedBeforeGivenPointInTime(allObjectVersions)
            .then(function(versionList) {
                return buildVersionListForRowsCreatedAfterGivenPointInTime(versionList, allObjectVersions);
            })
            .then(deferred.resolve);

        return deferred.promise;
    }


    function _init() {
        if (params) {
            restoreToPointInTime = params.restoreToPointInTime || new Date();
            s3Params.Bucket = params.Bucket || '';
            s3Params.Prefix = params.Prefix || '';
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

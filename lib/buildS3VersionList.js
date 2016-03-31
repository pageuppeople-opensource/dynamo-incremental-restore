'use strict';

// var s3scan = require('s3scan');
// var stream = require('stream');
var AWS = require('aws-sdk');
var q = require('q');

module.exports = getVersion;

function getVersion(params) {

    var s3, restoreToPointInTime;
    var s3Params = {};

    function getAllObjectVersionsFromS3() {
        var s3DataContents = [];
        var deferred = q.defer();

        s3.listObjectVersions(params, function(err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                var contents = data;
                s3DataContents = s3DataContents.concat(contents.Versions);

                contents.DeleteMarkers.forEach(function(marker) {
                    marker.deletedMarker = true;
                    s3DataContents.concat(marker);
                });

                s3DataContents = s3DataContents.concat(contents.DeleteMarkers);
                if (data.IsTruncated) {
                    // Set Marker to last returned key
                    params.Marker = contents[contents.length - 1].Key;
                    s3ListObjects(params, cb);
                } else {
                    deferred.resolve(s3DataContents);
                }
            }
        });

        return deferred.promise;
    }

    function buildVersionListForUpdates(allObjectVersions) {
        var deferred = q.defer();
        buildVersionListForRowsCreatedBeforeGivenPointInTime(allObjectVersions)
            .then(function(versionList) {
                return buildVersionListForRowsCreatedAfterGivenPointInTime(versionList, allObjectVersions)
            })
            .then(deferred.resolve);

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

    function _init() {
        var 
        if (params) {
            restoreToPointInTime = params.restoreToPointInTime || new Date();

        }

        var s3 = new AWS.S3()

        var deferred = q.defer();

        var point
        if (params);

        getAllObjectVersionsFromS3()
            .then(buildVersionListForUpdates)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    }

    return _init();

    // return s3ListObjects();




    /*
        var objects = s3.listObjects({
            Bucket: process.env.BackupBucket
        }, function(err, data) {
            if (err) console.log(err, err.stack);
            else console.log(data);
        });
    */
    // console.log(objects);

    /*

    var uri = ['s3:/', process.env.BackupBucket, process.env.BackupPrefix, 'Formsmith.Blue.FormInstance'].join('/');

    console.log(uri);

    var objects = [];

    var stringify = new stream.Transform();
    stringify._writableState.objectMode = true;
    stringify._transform = function(data, enc, callback) {
        if (!data) return callback();
        console.log(data.Body.toString());
        callback(null, data.Body.toString() + '\n');
    };

    var objStream = 
        s3scan.Scan(uri, { s3: s3 })
        .on('data', function(data) {
          console.log('Received data: ');
          console.log(data);
          objects.push(data.Body);
        })
        .on('end', function() {
          console.log('END');
          console.log(objects);
          callback.succeed("Successfully processed.");
        })
        .on('error', function(err) { console.log(err); })
        .pipe(stringify)
        
        ;
    //objStream.pipe(stringify).pipe(gzip);

    */

};

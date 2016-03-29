/*
 * dynamo-incremental-restore
 * https://github.com/abhayachauhan/dynamo-incremental-restore
 *
 * Copyright (c) 2016 Abhaya Chauhan
 * Licensed under the MIT license.
 */

'use strict';

// var s3scan = require('s3scan');
// var stream = require('stream');
var AWS = require('aws-sdk');
var q = require('q');
module.exports = getVersion;

function getVersion(restoreToDate) {
    if (!restoreToDate) {
        restoreToDate = new Date();
    }

    var s3 = new AWS.S3();

    var s3DataContents = []; // Single array of all combined S3 data.Contents

    function s3Print(data) {
        if (!data)
            console.log(JSON.stringify(s3DataContents, null, "    "));
        else
            console.log(JSON.stringify(data, null, "    "));
    }

    function s3ListObjects(params) {
        var deferred = q.defer();

        s3.listObjectVersions(params, function(err, data) {
            if (err) {
                // console.log("listS3Objects Error:", err);
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
                    var finalData = processVersion(restoreToDate);

                    deferred.resolve(finalData);
                }
            }
        });

        return deferred.promise;
    }

    function filterData(filterDate) {
        return s3DataContents.filter(function(version) {
            var diff = filterDate - new Date(version.LastModified);
            return (diff >= 0) ? true : false;
        });
    }

    function processVersion(date) {
        var filteredData = filterData(date);
        var newData = [];
        filteredData.forEach(function(data) {
            if ( (!(data.Key in newData)) 
                || ((new Date(newData[data.Key].LastModified) - new Date(data.LastModified)) < 0) ) {

                if (data.deletedMarker)
                {
                    delete newData[data.Key];
                }
                else {
                    newData[data.Key] = data;    
                }                
            }
        });
        return newData;
    }

    return s3ListObjects({
        Bucket: process.env.BackupBucket,
        Prefix: process.env.BackupPrefix,
    });




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

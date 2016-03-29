var AWS = require('aws-sdk');
var s3scan = require('s3scan');
var stream = require('stream');

//process.env.BackupBucket = 'dynamo-incremental-backups'
process.env.BackupBucket = 'pageup-test-versions'
process.env.BackupPrefix = ''

//AWS.config.region = 'eu-west-1';

module.exports.getVersion = getVersion;

function getVersion(event, callback) {
	var s3 = new AWS.S3();

	var s3DataContents = [];    // Single array of all combined S3 data.Contents

	function s3Print(data) {
		if (!data)
        	console.log(JSON.stringify(s3DataContents, null, "    "));
        else
        	console.log(JSON.stringify(data, null, "    "));
	}

	function s3ListObjects(params) {
	    s3.listObjectVersions(params, function(err, data) {
	        if (err) {
	            console.log("listS3Objects Error:", err);
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
	                params.Marker = contents[contents.length-1].Key;
	                s3ListObjects(params, cb);
	            } else {
	            	s3Print();
	                var data = processVersion(new Date('2016-03-23T06:34:31.000Z'));
	                s3Print(data);
	                callback.succeed('Done!');
	            }
	        }
	    });
	}

	function filterData(filterDate) {
		return s3DataContents.filter(function(version) {
			var diff = filterDate - new Date(version.LastModified);
			return (diff >= 0) ? true : false;
		});
	}

	function contains(arr, x) {
    	return arr.filter(x).length;
	}


	function processVersion(date) {
		var filteredData = filterData(date);
		var newData = [];
		return filteredData.forEach(function(data) {
			if (!(data.Key in newData) || (newData[data.Key].LastModified - data.LastModified < 0) ) {
				newData[data.Key] = data;
			}			
		});
		return newData;
	}

	s3ListObjects({
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
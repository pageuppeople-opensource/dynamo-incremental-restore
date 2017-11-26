'use strict';

var buildList = require('./buildS3VersionList.js');
var pushToDynamo = require('./s3ToDynamo.js');

module.exports.buildList = buildList;
module.exports.pushToDynamo = pushToDynamo;

module.exports.logbuildList = function(event, context, callback) {
	console.time('BuildVersionListFromS3');
	buildList(event).then(function(data) {
		console.timeEnd('BuildVersionListFromS3');
		console.log('Sending this data to Dynamo: ' + JSON.stringify(data));
		console.time('PushToDynamo');
		pushToDynamo({ destinationTableName: event.DestinationTableName, bucket: event.Bucket, region: event.region}, data).then(function(returnedData) {
			console.timeEnd('PushToDynamo');
			console.log('Success!');
			console.log(JSON.stringify(returnedData));
			return callback(null, data);
		}, error).catch(catchError);		
	}, error).catch(catchError);

	function error(err) {
		console.log('Error: ' + err);
		callback(err);
	}

	function catchError(err) {
		console.log('Catch: ' + err);
		callback(err);
	}
}

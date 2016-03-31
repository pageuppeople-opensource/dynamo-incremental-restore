'use strict'

var buildList = require('./buildS3VersionList.js');
var pushToDynamo = require('./s3ToDynamo.js');

module.exports.buildList = buildList;
module.exports.pushToDynamo = pushToDynamo;
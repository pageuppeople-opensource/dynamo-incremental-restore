/*
 * dynamo-incremental-restore
 * https://github.com/abhayachauhan/dynamo-incremental-restore
 *
 * Copyright (c) 2016 Abhaya Chauhan
 * Licensed under the MIT license.
 */

'use strict';

var dynamoIncrementalRestore = require('../');

console.log(dynamoIncrementalRestore.restoreFilteredCachedVersionList({
    filterCachedVersionList: 'Formsmith.Green.Form.fout',
    Bucket: "pageup-dynamodb-backups-au", //The bucket where the data is stored. e.g. pageup-dynamo-backup
    DestinationTableName: "Formsmith.DR.Form" , //The table to restore to
    region: "ap-southeast-2" //Dynamo Region. Change for each datacenter
}));


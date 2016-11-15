/*
 * dynamo-incremental-restore
 * https://github.com/abhayachauhan/dynamo-incremental-restore
 *
 * Copyright (c) 2016 Abhaya Chauhan
 * Licensed under the MIT license.
 */

'use strict';

var dynamoIncrementalRestore = require('../');

console.log(dynamoIncrementalRestore.logbuildList({
    Prefix: "Formsmith/Formsmith.Green.FormData/543",  //Adjust the InstID as needed. OR you can not provide an Inst ID and you get all the forms
    DestinationTableName: "Formsmith.Green.FormData" , //The table to backup. 1 table at a time
    Bucket: "pageup-dynamo-backup", //The bucket where the data is stored. 
    restoreToPointInTime: new Date('2020-11-14T23:50:32.000Z'), //the last point in time you want to update a version
    //restoreToPointInTime: new Date('2016-11-14T23:50:32.000Z'), 
    region: "ap-southeast-2" //Dynamo Region
}));


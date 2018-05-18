/*
 * dynamo-incremental-restore
 * https://github.com/abhayachauhan/dynamo-incremental-restore
 *
 * Copyright (c) 2016 Abhaya Chauhan
 * Licensed under the MIT license.
 */

'use strict';

var dynamoIncrementalRestore = require('../');

dynamoIncrementalRestore.filterCachedVersionList({
    restoreToPointInTime: '2020-11-14T23:50:32.000Z', //the last point in time you want to update a version
    cachedVersionListFileName: 'Formsmith.Green.Form'
}, null, function() { console.log('Done'); } );


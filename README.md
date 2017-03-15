# dynamo-incremental-restore 
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-url]][daviddm-image] [![Coverage Status][coveralls-image]][coveralls-url]

Restore DynamoDb data from S3 incremental backups


## Install

```bash
$ npm install --save dynamo-incremental-restore
```

## Usage
### Example Files
example-restore-to-point.js
```javascript
var dynamoIncrementalRestore = require('../');

console.log(dynamoIncrementalRestore.logbuildList({
    Prefix: "ServiceFolder/TableFolder/ClientID",  // Where the files sit. Use parent folders and it should recursively find all child document/files e.g. Formsmith/Formsmith.Blue.FormSchema/543
    DestinationTableName: "Example Table Name" ,// e.g. Formsmith.Blue.FormSchema
    Bucket: "au-backup-bucket-name", // e.g. pageup-dynamo-backup
    restoreToPointInTime: '2020-11-14T23:50:32.000Z', //the last point in time you want to update a version as an ISO-8601 string
    region: "ap-southeast-2" //Dynamo Region. Change for each datacenter
}));
```
This will be fine to run both on your local environment (for testing the dev datacenter) or uploaded into an EC2 instance with the appropriate permissions to access client data for backing up. Clone the repository into a machine you want to perform the task on and use node to run the script. 

### Running on AWS
Run package.ps1 to bundle up the code into LambdaFunction.zip, which is ready to upload as a Lambda function to AWS. 
Set the handler to be index.logbuildList, give it a role with the appropriate permissions, and run it by giving it a test event in the form:
```json
{
    "Prefix": "ServiceFolder/TableFolder/ClientID",
    "DestinationTableName": "Example Table Name" , 
    "Bucket": "au-backup-bucket-name", 
    "restoreToPointInTime": "2020-11-14T23:50:32.000Z", 
    "region": "ap-southeast-2" 
}
```

##TODO

1. Batch writes to Dynamo in blocks of 25, and handle unprocessed items
2. Break process into three steps (Build Version List, Build Dynamo Requests, Send Requests to Dynamo)

## API

See index.js


## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [gulp](http://gulpjs.com/).


## License

Copyright (c) 2016 Abhaya Chauhan. Licensed under the MIT license.



[npm-url]: https://npmjs.org/package/dynamo-incremental-restore
[npm-image]: https://badge.fury.io/js/dynamo-incremental-restore.svg
[travis-url]: https://travis-ci.org/abhayachauhan/dynamo-incremental-restore
[travis-image]: https://travis-ci.org/abhayachauhan/dynamo-incremental-restore.svg?branch=master
[daviddm-url]: https://david-dm.org/abhayachauhan/dynamo-incremental-restore.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/abhayachauhan/dynamo-incremental-restore
[coveralls-url]: https://coveralls.io/r/abhayachauhan/dynamo-incremental-restore
[coveralls-image]: https://coveralls.io/repos/abhayachauhan/dynamo-incremental-restore/badge.png

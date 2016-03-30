# dynamo-incremental-restore 
[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-url]][daviddm-image] [![Coverage Status][coveralls-image]][coveralls-url]

Restore DynamoDb data from S3 incremental backups


## Install

```bash
$ npm install --save dynamo-incremental-restore
```


## Usage

```javascript
// Restore DynamoDb to latest version
var dynamoIncrementalRestore = require('dynamo-incremental-restore');
dynamoIncrementalRestore();
```

or

```javascript
// Restore DynamoDb to April 1st 2016, at midnight.
var dynamoIncrementalRestore = require('dynamo-incremental-restore');
dynamoIncrementalRestore(new Date('2016-04-01T00:00:00.000Z'));
```

## API

_(Coming soon)_


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

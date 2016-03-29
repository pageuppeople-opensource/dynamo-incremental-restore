var testData = require('./test-data.json');

module.exports = {
    S3: function() {
        return {
            listObjectVersions: function(params, cb) {
				cb(false, testData);
            }
        };
    }
};

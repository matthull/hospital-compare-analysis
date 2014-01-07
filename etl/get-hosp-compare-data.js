/**
 * Module dependencies.
 */

var http = require('http');
var mongo = require('mongodb');

var MongoServer = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var server = new MongoServer('localhost', 27017, {auto_reconnect: true});
var db = new Db('hosp', server);

var request = require('request');
db.open(function(err,db) {
    var hospitalsCollection = db.collection('hospitalsRaw');
    var rowCount = 0;
    [0,1000,2000,3000,4000,5000].forEach(function (offset) {
        console.log('retrieving hospitals starting with ' + offset);
        request('http://data.medicare.gov/resource/v287-28n3.json?$$app_token=2I2Z6fMimNMRGfqlwShjSbeCU&$limit=1000&$offset='+offset, function(err, response, body) {
            if (!err && response.statusCode === 200) {
                hospitalsCollection.insert(JSON.parse(body), function(err, records){if(err){console.log(err)}});
            }
            else console.log('Status code: ' + response.statusCode, body);
        });
    });

    var outcomesCollection = db.collection('outcomesRaw');
    [0, 1000, 2000, 3000, 4000, 5000, 6000].forEach(function (offset) {
        console.log('retrieving outcomes starting with ' + offset);
        request('http://data.medicare.gov/resource/rcw8-6swd.json?$$app_token=2I2Z6fMimNMRGfqlwShjSbeCU&$offset='+offset, function (err, response, body) {
            if (!err && response.statusCode === 200) {
                outcomesCollection.insert(JSON.parse(body), function(err, records){if(err){console.log(err)}});
            }
            else console.log('Status code: ' + response.statusCode, body);
        })
    });
})

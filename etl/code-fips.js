var http = require('http');
var mongo = require('mongodb');

var MongoServer = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var server = new MongoServer('localhost', 27017, {auto_reconnect: true});
var db = new Db('hosp', server);

var request = require('request');
db.open(function(err,db) {
    var collection = db.collection('hospitalsRaw');
    collection.find({}).each(function (err, doc) {
        if (doc) console.log('processing doc ' + doc._id);
        if (doc && typeof doc.censusData === "string") {
            doc.censusData = undefined;
            console.log('removing census data from doc ' + doc._id);
            collection.save(doc);
        }
        if (doc && typeof doc.censusData !== "object" && doc.location.latitude) {
            urlParts = ['http://data.fcc.gov/api/block/find?format=json'];
            urlParts.push('latitude=' + doc.location.latitude);
            urlParts.push('longitude=' + doc.location.longitude);
            urlParts.push('showall=true');
            url = urlParts.join('&');

            request(url, function(err, response, body) {
                doc.censusData = JSON.parse(body);
                collection.save(doc);
            });
        }
    });
});

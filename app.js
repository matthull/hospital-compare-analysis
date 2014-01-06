
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var mongo = require('mongodb');

var MongoServer = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 604800 }));

app.use(require('connect-assets')());

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

var requirejs = require('requirejs');

requirejs.config({
    nodeRequire: require
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var server = new MongoServer('localhost', 27017, {auto_reconnect: true});
db = new Db('hosp', server);

app.get('/hospitals', function (req, res) {
    db.open(function () {
        var collection = db.collection('hospitalsRaw');
        collection.find({}).toArray(function (err, items) {
            if (err) res.send(err, 500);
            else res.send(items);
            db.close();
        });
    })
});

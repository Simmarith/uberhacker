var uberhacker = require('express')();
var http = require('http').Server(uberhacker);
var path = require('path');

uberhacker.get('/', function(req, res) {
    res.sendFile(path.resolve('../client/index.html'));
});

uberhacker.get('/*', function(req, res) {
    res.sendFile(path.resolve('../client' + req.path));
});

http.listen('8080', function() {
    console.log('Server engaged.');
});
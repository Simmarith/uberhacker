var uberhacker = require('express')();
var http = require('http').Server(uberhacker);
var path = require('path');
var io = require('socket.io')(http);
var sessions = require('./objects/session.js');
var games = require('./objects/game.js');
var users = require('./objects/user.js');

uberhacker.get('/', function(req, res) {
    res.sendFile(path.resolve('../client/index.html'));
});

uberhacker.get('/*', function(req, res) {
    res.sendFile(path.resolve('../client' + req.path));
});

//TODO: figure out socket.io
var session = sessions.newSession(io);

io.on('connection', function(socket) {
    console.log('a user connected');
    session.users.push(users.newUser(socket));
    session.game = 'fastType';
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
    // socket.on('chat message', function(msg) {
    //     console.log('message: ' + msg);
    //     io.emit('chat message', msg);
    // });
});

http.listen('8080', function() {
    console.log('Server engaged.');
});
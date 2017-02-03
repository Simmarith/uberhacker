var uberhacker = require('express')();
var http = require('http').Server(uberhacker);
var path = require('path');
var io = require('socket.io')(http);
var sessions = require('./objects/session.js');
var games = require('./objects/game.js');
var users = require('./objects/user.js');

uberhacker.get('/[^/]*/$', function(req, res) {
    res.sendFile(path.resolve('../client/index.html'));
});

uberhacker.get('/[^/]*/*', function(req, res) {
    pathArray = req.path.split('/');
    newPath = '../client';
    for (var i = 2; i < pathArray.length; i++) {
        newPath += '/' + pathArray[i];
    }
    res.sendFile(path.resolve(newPath));
});

uberhacker.get('/', function(req, res) {
    res.sendFile(path.resolve('../client/nameMe.html'));
});

//TODO: figure out socket.io
var session = sessions.newSession(io);

io.on('connection', function(socket) {
    session.killGames();
    let userId = socket.id;
    console.log(userId + ' connected');
    session.users[userId] = users.newUser(socket, session);
    session.game = 'fastType';
    socket.on('username', function(id, username) {
        console.log('ID "' + id + '" wants to be called "' + username + '"');
        session.users[id].username = username;
    });
    socket.on('disconnect', function() {
        console.log(userId + ' disconnected');
        delete session.users[userId];
    });
});

http.listen('8080', function() {
    console.log('Server engaged.');
});
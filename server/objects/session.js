var games = require('./game.js');

module.exports = {
    newSession: function(socket) {
        var session = {
            users: {},
            topScore: 0,
            socket: socket,
            start: function() {},
            stop: function() {},
            score: function(user, value) {},
            sendGame: function(gameData) {
                this.socket.emit('game', gameData);
                for (var user in this.users) {
                    let gameResolve = (socketId, gameResolve) => {
                        if (gameResolve == this.game.gameResolve) {
                            console.log(socketId + '(' + this.users[socketId].username + ') was right!');
                            this.users[socketId].score++;
                            this.killGames();
                            this.game = "fastType";
                        }
                        else {
                            console.log('he was wrong! He sent: ' + gameResolve);
                        }
                    };

                    this.users[user].socket.on('gameResolve', gameResolve);

                    this.users[user].gameResolve = gameResolve;
                }
            },
            sendScoreBoard: function() {
                let scoreBoard = [];
                for (var user in this.users) {
                    let scoreBoardEntry = {};
                    scoreBoardEntry.username = this.users[user].username;
                    scoreBoardEntry.score = this.users[user].score;
                    scoreBoard.push(scoreBoardEntry);
                }
                for (var user in this.users) {
                    this.users[user].socket.emit('scoreBoard', scoreBoard);
                }
            },
            killGames: function() {
                if (this.game) {
                    for (var user in this.users) {
                        this.users[user].socket.removeListener('gameResolve', this.users[user].gameResolve);
                    }
                    this.socket.emit('killGame', this.game.title);
                }
            }
        }

        Object.defineProperty(session, 'game', {
            get: function() { return this._game; },
            set: function(value) {
                this._game = games[value];
                this.sendGame(this._game.play());
            }
        });

        return session;
    }
};

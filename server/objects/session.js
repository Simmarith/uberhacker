var games = require('./game.js');

module.exports = {
    newSession: function(socket) {
        var session = {
            users: [],
            topScore: 0,
            socket: socket,
            start: function() {},
            stop: function() {},
            score: function(user, value) {},
            sendGame: function(gameData) {
                this.socket.emit('game', gameData);
                for (var i = this.users.length - 1; i >= 0; i--) {
                    let gameResolve = (gameResolve) => {
                        //TODO: Assign point to player and kill listeners
                        if (gameResolve == this.game.gameResolve) {
                            console.log('he was right!');
                            this.killGames();
                            this.game = "fastType";
                        }
                        else {
                            console.log('he was wrong! He sent: ' + gameResolve);
                        }
                    };
                    
                    this.users[i].socket.on('gameResolve', gameResolve);
                    
                    this.users[i].gameResolve = gameResolve;
                }
            },
            killGames: function() {
                for (var i = this.users.length; i--;) {
                    this.users[i].socket.removeListener('gameResolve', this.users[i].gameResolve);
                }
                this.socket.emit('killGame', this.game.title);
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

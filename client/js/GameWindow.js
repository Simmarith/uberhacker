var GameWindow = {
    newGameWindow: function() {
        var gameWindow = {
            hackWindow: HackWindow.newHackWindow(),
            currGame: null,
            appendTo: function(target) { this.hackWindow.appendTo(target); },
            kill: function() {
                if (this.currGame) {
                    this.currGame.kill();
                    this.hackWindow.hackWindowNode.detach();
                }
            }
        }

        Object.defineProperty(gameWindow, 'game', {
            get: function() {
                return this.currGame.title;
            },
            set: function(value) {
                this.currGame = GameWindow.games[value];
                this.hackWindow.title = this.currGame.displayTitle;
                this.hackWindow.content = gameWindow.currGame.content;
            }
        });

        gameWindow.hackWindow.size = 'normal';
        gameWindow.hackWindow.x = 'center';
        gameWindow.hackWindow.y = 'center';

        return gameWindow;
    },
    games: {
        fastType: {
            title: 'fastType',
            displayTitle: 'passCrack v1.2.8',
            wordToType: '',
            content: $('<div class="game"><div class="info"></div><input class="gameInput"></input></div>'),
            play: function(word) {
                this.wordToType = word;
                this.content.find('.info').html('Type "' + word + '" into the next line.');
                this.content.find('.gameInput').on('change', function(e) {
                    socket.emit('gameResolve', socket.id, e.target.value);
                    console.log(e.target.value);
                });
                this.content.find('.gameInput').focus();
            },
            kill: function() {
                this.wordToType = '';
                this.content.find('.gameInput').val('');
            }
        },
        getNet: { title: 'getNet' }
    }
}
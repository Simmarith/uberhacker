module.exports = {
    fastType: {
        title: 'fastType',
        gameResolve: '',
        wordPool: [
            'lel',
            'session',
            'hacked',
            'access',
            'enter',
            'denied',
            'fast',
            'link',
            'ethernet',
            'wan',
            'lan',
            'network'
        ],
        play: function() {
            var gameData = this.wordPool[Math.round(Math.random() * (this.wordPool.length - 1))];
            this.gameResolve = gameData;
            gameData = this.title + '|' + gameData;
            return gameData;
        }
    },
    getNet: {
        title: 'getNet',
        gameResolve: '',
        play: function() {
            //TODO
            return gameData;
        }
    }
}
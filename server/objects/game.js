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
            var gameData = '';
            var question = this.newQuestion();
            this.gameResolve = question.network;
            gameData = this.title + '|' + question.ip;
            return gameData;
        },
        newQuestion: function() {
            let question = {};
            let ip = '';
            let net = '';
            let subNetMask = Math.round(Math.random() * 2) + 1;
            for (var i = 1; i <= 4; i++) {
                let subSet = Math.round(Math.random() * 255);
                ip += subSet + '.';
                if (subNetMask >= i) {
                    net += subSet + '.';
                }
                else {
                    net += '0.';
                }
            }
            ip = ip.substr(0, ip.length - 1) + '/' + (subNetMask * 8);
            net = net.substr(0, net.length - 1);
            question.ip = ip;
            question.network = net;
            return question;
        }
    }
}
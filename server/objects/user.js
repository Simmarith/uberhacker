module.exports = {
    newUser: function(socket, session) {
        var user = {
            socket: socket,
            username: '',
            session: session
        }
        
        Object.defineProperty(user, 'score', {
            get: function() {
                return this._score;
            },
            set: function(value) {
                this._score = value;
                this.session.sendScoreBoard();
            }
        });
        
        user.score = 0;
        
        return user;
    },
}
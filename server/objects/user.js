module.exports = {
    newUser: function(socket) {
        var user = {
            id: 0,
            socket: socket,
        }
        
        user.id = this.userCount;
        this.userCount++;
        
        return user;
    },
    userCount: 0
}
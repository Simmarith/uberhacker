var ScoreBoard = {
    scoreBoard: $(),
}

$(document).ready(function() {
    ScoreBoard.scoreBoardNode = $('#scoreboard');
});
Object.defineProperty(ScoreBoard, 'scores', {
    get: function() {
        return this._scores;
    },
    set: function(value) {
        console.log(value);
        this._scores = value;
        this.scoreBoardNode.empty();
        for (var i = 0; i < this._scores.length; i++) {
            this.scoreBoardNode.append($('<div class="playerbar">' + this._scores[i].username + ': ' + this._scores[i].score + '</div>')); //TODO: add scores
        }
    }
});

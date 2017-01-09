var HackWindow = {
    newHackWindow : function() {
        var hackWindow = {
            //Properties
            hackWindowNode : $('<div class="window small"><div class="content"></div><div class="windowtitle"></div></div>'),
            size: 'small',
            //Methods
            appendTo: function(target) { this.hackWindowNode.appendTo(target); },
        };
        
        Object.defineProperty(hackWindow, 'title', {
            get: function() { return this._title; },
            set: function(value) { this.hackWindowNode.find('.windowtitle').html(value); }
        });
        
        Object.defineProperty(hackWindow, 'content', {
            get: function() { return this._content; },
            set: function(value) { this.hackWindowNode.find('.content').html(value); }
        });
        
        return hackWindow;
    }
};
var HackWindow = {
    newHackWindow: function() {
        var hackWindow = {
            //Properties
            hackWindowNode: $('<div class="window"><div class="content"></div><div class="windowtitle"></div></div>'),
            //Methods
            appendTo: function(target) { this.hackWindowNode.appendTo(target); },
        };

        Object.defineProperty(hackWindow, 'title', {
            get: function() { return this._title; },
            set: function(value) {
                this.hackWindowNode.find('.windowtitle').html(value);
                this._title = value;
            }
        });

        Object.defineProperty(hackWindow, 'content', {
            get: function() { return this._content; },
            set: function(value) {
                this.hackWindowNode.find('.content').html(value);
                this._content = value;
            }
        });

        Object.defineProperty(hackWindow, 'size', {
            get: function() { return this._size; },
            set: function(value) {
                this.hackWindowNode.removeClass('small');
                this.hackWindowNode.removeClass('normal');
                this.hackWindowNode.removeClass('large');
                this.hackWindowNode.addClass(value);

            }
        });
        //defaults
        hackWindow.size = 'small';

        return hackWindow;
    }
};
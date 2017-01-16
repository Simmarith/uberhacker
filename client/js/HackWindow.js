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

        Object.defineProperty(hackWindow, 'x', {
            get: function() { return this._x; },
            set: function(value) {
                if (value == 'random') {
                    var maxX = window.innerWidth - this.hackWindowNode.width();
                    value = Math.random() * maxX;
                }
                this._x = value;
                this.hackWindowNode.css('left', value);
            }
        });
        Object.defineProperty(hackWindow, 'y', {
            get: function() { return this._y; },
            set: function(value) {
                if (value == 'random') {
                    var maxY = window.innerHeight - this.hackWindowNode.height();
                    value = Math.random() * maxY;
                }
                this._y = value;
                this.hackWindowNode.css('top', value);
            }
        });
        //defaults
        hackWindow.size = 'small';

        return hackWindow;
    }
};
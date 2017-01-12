var NonsenseWindow = {
    newNonsenseWindow: function() {
        var nonsenseWindow = {
            hackWindow: HackWindow.newHackWindow(),
            content: [],
            lastLine: 0,
            play: function() {
                for (var i = 0; i < this.content.length; i++) {
                    window.setTimeout(() => { this.playNextLine(); }, (100 * i));
                }
            },
            playNextLine: function() {
                let content = '';
                if (this.lastLine > 14) {
                    for (var j = 14; j > 0; j--) {
                        content += this.content[this.lastLine - j] + '<br>';
                    }
                }
                else {
                    for (var j = 0; j < this.lastLine; j++) {
                        content += nonsenseWindow.content[j] + '<br>';
                    }
                }
                this.hackWindow.content = content;
                this.lastLine++;
            },
            appendTo: function(target) {this.hackWindow.appendTo();}
        }
        //TODO: decide scenario randomly
        nonsenseWindow.hackWindow.title = NonsenseWindow.scenarios[0].title;
        nonsenseWindow.content = NonsenseWindow.scenarios[0].content;
        return nonsenseWindow;
    },
    //TODO: add more scenarios
    scenarios: [{
        title: 'bruteForce-v1.4.1',
        content: ['bruteForce Engine v1.4.1', 'engaging.............................', 'engaged!', 'Specify target:', 'http://sillysecure.gov/login.php', '', 'target aquired!', 'starting Brute Force Attack......', '[1%] bruteforcing...', '[4%] bruteforcing...', '[9%] bruteforcing...', '[13%] bruteforcing...', '[17%] bruteforcing...', '[20%] bruteforcing...', '[25%] bruteforcing...', '[32%] bruteforcing...', '[36%] bruteforcing...', '[41%] bruteforcing...', '[43%] bruteforcing...', '[47%] bruteforcing...', '[52%] bruteforcing...', '[59%] bruteforcing...', '[63%] bruteforcing...', '[67%] bruteforcing...', '[70%] bruteforcing...', '[76%] bruteforcing...', '[81%] bruteforcing...', '[84%] bruteforcing...', '[89%] bruteforcing...', '[92%] bruteforcing...', '[98%] bruteforcing...', '[100%] bruteforcing...', '[100%] bruteforcing...  complete!', '', 'username: u23r', 'password: p422w0rd']
    }]
}
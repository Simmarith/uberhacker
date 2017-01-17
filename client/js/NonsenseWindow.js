var NonsenseWindow = {
    newNonsenseWindow: function() {
        var nonsenseWindow = {
            hackWindow: HackWindow.newHackWindow(),
            content: [],
            speed: 50,
            lastLine: 0,
            play: function() {
                for (var i = 0; i < this.content.length; i++) {
                    window.setTimeout(() => { this.lastLine++; }, (this.speed * i));
                }
            },
            appendTo: function(target) { this.hackWindow.appendTo(target); }
        }

        Object.defineProperty(nonsenseWindow, 'scenario', {
            get: function() { return this._scenario; },
            set: function(value) {
                if (value == 'random') {
                    value = Math.round(Math.random() * (NonsenseWindow.scenarios.length - 1));
                }
                this._scenario = value;
                this.hackWindow.title = NonsenseWindow.scenarios[value].title;
                this.content = NonsenseWindow.scenarios[value].content;
            }
        });
        Object.defineProperty(nonsenseWindow, 'lastLine', {
            get: function() { return this._lastLine; },
            set: function(value) {
                this._lastLine = value;
                let content = '';
                if (this._lastLine > 14) {
                    for (var j = 14; j > 0; j--) {
                        content += this.content[this._lastLine - j] + '<br>';
                    }
                }
                else {
                    for (var j = 0; j < this._lastLine; j++) {
                        content += nonsenseWindow.content[j] + '<br>';
                    }
                }
                this.hackWindow.content = content;
            }
        });

        nonsenseWindow.scenario = 'random';
        nonsenseWindow.lastLine = 0;
        return nonsenseWindow;
    },
    //TODO: add more scenarios
    scenarios: [{
            title: 'bruteForce-v1.4.1',
            content: ['bruteForce Engine v1.4.1',
                'engaging.............................',
                'engaged!',
                'Specify target:', 'http://sillysecure.gov/login.php',
                '',
                'target aquired!',
                'starting Brute Force Attack......',
                '[1%] bruteforcing...',
                '[4%] bruteforcing...',
                '[9%] bruteforcing...',
                '[13%] bruteforcing...',
                '[17%] bruteforcing...',
                '[20%] bruteforcing...',
                '[25%] bruteforcing...',
                '[32%] bruteforcing...',
                '[36%] bruteforcing...',
                '[41%] bruteforcing...',
                '[43%] bruteforcing...',
                '[47%] bruteforcing...',
                '[52%] bruteforcing...',
                '[59%] bruteforcing...',
                '[63%] bruteforcing...',
                '[67%] bruteforcing...',
                '[70%] bruteforcing...',
                '[76%] bruteforcing...',
                '[81%] bruteforcing...',
                '[84%] bruteforcing...',
                '[89%] bruteforcing...',
                '[92%] bruteforcing...',
                '[98%] bruteforcing...',
                '[100%] bruteforcing...',
                '[100%] bruteforcing...  complete!',
                '',
                'username: u23r',
                'password: p422w0rd'
            ]
        },
        {
            title: 'H4X Torrent X',
            content: ['+-----------------------------+',
                //Descisions have been made; I'm not proud of this either
                '|&nbsp;&nbsp;&nbsp;&nbsp;h4x Torrent v.17.2.11&nbsp;&nbsp;&nbsp;&nbsp;|',
                '+-----------------------------+',
                '',
                'enter hostname: http://allcracks.co.cz',
                '...',
                '...connected!',
                'enter search tags:',
                'Microsoft Exchange 2016 Backdoor',
                '...',
                '....',
                '.....',
                '/-----RESULTS-----/',
                '[0] msExExploit_20160210.sh',
                '[1] ExchangeCrack_20170506.bat',
                '[2] msExExploit_20161020.sh',
                '[3] msExExploit_20160414.sh',
                '[4] msOfficeSuite_full_2013_crack.exe',
                '[5] msOutlook_2016_crack_VERIFIED.exe',
                '',
                'select download [0-5] or abort [X]',
                '2',
                'msExExploit_20161020.sh',
                'starting download',
                'starting download.',
                'starting download..',
                'starting download...',
                'starting download....',
                'starting download.....',
                'starting download......',
                'starting download.......',
                'starting download........',
                'connection established! Starting download.',
                '>',
                '=>',
                '==>',
                '===>',
                '====>',
                '=====>',
                '======>',
                '=======>',
                '========>',
                '=========>',
                '==========>',
                '===========>',
                '============>',
                '=============>',
                '==============>',
                '===============>',
                '================>',
                '=================>',
                '==================>',
                '===================>',
                '====================>',
                '=====================>',
                '======================>',
                '=======================>',
                '========================>',
                '=========================>',
                '==========================>',
                'downloaded!'
            ]
        },
        {
            title: 'FTPurge 17.2',
            content: ['FTPurge version 17.02.14',
                '',
                'please specify Server to purge:',
                'ftp.KiddoCraft.com',
                'destructive mode on? THIS WILL IRREVERSABLY',
                'ERASE YOUR SERVER AFTER COPY [y/N] y',
                'connecting to Server.',
                'connecting to Server..',
                'connecting to Server...',
                'connecting to Server....',
                'connecting to Server.....',
                'connecting to Server......',
                'connecting to Server.......',
                'connecting to Server........',
                'connecting to Server........connected!',
                'enter username:',
                '4dmin',
                'enter password:',
                '',
                'access granted!',
                'start copying.',
                'start copying..',
                'start copying...',
                'start copying....',
                'create folder ~/ftps/KiddoCraft',
                '/var/www/index.html copied!',
                '/var/www/main.js copied!',
                '/var/www/style.css copied!',
                '/var/www/images/minecraft_logo.png copied!',
                '/var/www/images/KiddoCrafter_skin.bmp copied!',
                '/var/www/images/xXxo0oShadowDragon03o0oxXx_skin.bmp copied!',
                '/var/www/images/blocky_1080p_wallpaper.jpg copied!',
                '/var/www/images/button.bmp copied!',
                '/var/www/images/spawn.png copied!',
                '/var/www/addUser.php copied!',
                '/var/www/delUser.php copied!',
                '/var/www/checkPassword.php copied!',
                '/var/www/js/main.js copied!',
                '/var/www/js/bounceButton.js copied!',
                '/var/www/server.html copied!',
                '/var/www/about.html copied!',
                '/var/www/admins.html copied!',
                '/root/minecraftBackups/20150101.tar copied!',
                '/root/minecraftBackups/20150102.tar copied!',
                '/root/minecraftBackups/20150103.tar copied!',
                '/root/minecraftBackups/20150104.tar copied!',
                '/root/minecraftBackups/20150105.tar copied!',
                '/root/minecraftBackups/20150106.tar copied!',
                '/root/minecraftBackups/20150107.tar copied!',
                '/root/minecraftBackups/20150108.tar copied!',
                '/root/minecraftBackups/20150109.tar copied!',
                '/root/minecraftBackups/20150110.tar copied!',
                '/root/minecraftBackups/20150111.tar copied!',
                '/root/minecraftBackups/20150112.tar copied!',
                '/root/minecraftBackups/20160101.tar copied!',
                '/root/minecraftBackups/20160102.tar copied!',
                '/root/minecraftBackups/20160103.tar copied!',
                '/root/minecraftBackups/20160104.tar copied!',
                '/root/minecraftBackups/20160105.tar copied!',
                '/root/minecraftBackups/20160106.tar copied!',
                'copy complete!',
                'deleting remote.',
                'deleting remote..',
                'deleting remote...',
                'deleting remote....',
                'deleting remote.....',
                'deleting remote......',
                'deleting remote.......',
                'deleting remote........',
                'deleting remote.........',
                'deleting remote..........',
                'deleting remote...........',
                'deleting remote............',
                'deleting remote.............',
                'deleting remote..............',
                'deleting remote...............',
                'deleting remote................',
                'deleting remote.................',
                'deleting remote..................',
                'remote empty!',
                'purge successful!'
            ],
        }
    ]
};

  $(function() {
      $(".window").draggable();
      $("#iconbar").draggable();

  });

  function randomColor() {
      colbase = Math.floor(Math.random() * 16777215).toString(16);
      colback = Math.floor(Math.random() * 16777215).toString(16);
      console.log("#" + colbase + "  -- #" + colback);
      less.modifyVars({
          '@base': '#' + colbase,
          '@back': '#' + colback
      });

  }

  window.setInterval(function() { less.watch(); }, 500);
  var username = /\/([^\/]*)\/.*$/.exec(window.location.pathname)[1];
  var socket = io();
  var gameObj = GameWindow.newGameWindow();
  socket.on('game', function(game) {
      console.log('New game should now spawn: ' + game);
      gameData = game.split('|');
      gameObj.game = gameData[0];
      gameObj.appendTo('#windowlist');
      gameObj.hackWindow.focusMe();
      gameObj.currGame.play(gameData[1]);
  });
  socket.on('killGame', function(game) {
      console.log(game + ' - should now be killed');
      gameObj.kill();
  });
  socket.on('scoreBoard', function(scores) { ScoreBoard.scores = scores; });
  console.log(socket);
  //socket.emit('username', socket.id, username);
  function watchUsername() {
      if (socket.id) {
          socket.emit('username', socket.id, username);
      } else {
          setTimeout(watchUsername, 100);
      }
  }
  watchUsername();
  
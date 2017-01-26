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

window.setInterval(function () { less.watch(); },500);
var socket = io();
socket.on('game', function(game) { console.log(game); });
socket.on('killGame', function(game) { console.log(game + ' - should now be killed'); });

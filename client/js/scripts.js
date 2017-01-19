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

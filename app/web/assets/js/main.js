const backend = require("electron").ipcRenderer;
const copyToClipboard = require("electron").clipboard.writeText;
var socket;
var connected;
var forced;
if (localStorage.dev_key) {
  console.log(localStorage.dev_key);
  startSocket(localStorage.dev_key);
} else {
  $("#connecting").fadeIn();
}
function startSocket(key) {
  if (connected) return;
  console.log(key);
  socket = io($("#host").val());
  let i = setInterval(() => {
    if (connected || forced) return (forced = false);
    if (localStorage.dev_key) {
      localStorage.dev_key = "";
      delete localStorage.dev_key;
      $.notify("Unable to connect automatically");
    } else {
      $.notify("Unable to connect after 5s");
    }
    clearInterval(i);
    socket.disconnect() && socket.destroy();
    $("#connecting").fadeIn();
  }, 5000);
  socket.on("connect", function() {
    socket.emit("client_analytics");
    if (!connected) connected = true;
    else return;
    console.log(connecting);
    $.notify("Connected!", "success");
    if (key) {
      copyToClipboard(key);
      $.notify("Password copied to clipboard", "info");
    }
    $("#connecting").fadeOut(function(authenticated) {
      if (key) {
        return socket.emit("password", key);
      }
      if (!authenticated) {
        $("#password-div").fadeIn();
      } else {
        $("#main").fadeIn();
      }
    });
  });

  socket.on("correct_password", function(key) {
    localStorage.dev_key = key;
    $("#password-div").fadeOut(function() {
      $("#main").fadeIn();
    });
  });

  socket.on("disconnect", function() {
    if (!connected) return;
    $("#main").fadeOut();
    $("#connecting").fadeIn();
    $.notify("Disconnected", "warning");
    connected = false;
  });

  socket.on("wrong_password", function(tries) {
    if (localStorage.dev_key) {
      delete localStorage.dev_key;
      $("#connecting").fadeIn();
    } else {
      $("#password-div").fadeIn();
    }
    $("#password-error").html(
      '<span style="color: red">Password was incorrect, ' +
        (5 - tries) +
        " tries left!</span>"
    );
  });

  socket.on("server_analytics", function(data) {
    const today = data.filter(
      x => x.name == new Date().toISOString().split("T")[0]
    );
  });
  function changeStatus(name, value) {
    const color = $(`#${name}-color`);
    const face = $(`#${name}-icon`);
    const text = $(`#${name}-status`);
    function emotion(good) {
      if (good) {
        text.text("Good");
        face.removeClass("fa-frown");
        face.addClass("fa-smile");
        color.removeClass("text-danger");
        color.addClass("text-success");
      } else {
        text.text("Bad");
        face.removeClass("fa-smile");
        face.addClass("fa-frown");
        color.removeClass("text-success");
        color.addClass("text-danger");
      }
    }
    $(`#${name}`).text(value + $(`#${name}`).attr("data-units"));
    switch (name) {
      case "ram":
        if (value < 300) {
          emotion(true);
        } else {
          emotion(false);
        }
        break;
      case "cpu":
        if (value < 20) {
          emotion(true);
        } else {
          emotion(false);
        }
        break;
    }
  }
  setInterval(function() {
    socket.emit("stats");
  }, 2000);
  socket.on("cpu", function(data) {
    changeStatus("cpu", data);
  });
  socket.on("ram", function(data) {
    changeStatus("ram", data);
  });
  $("#password-button").click(function() {
    $("#password-error").html("");
    socket.emit("password", $("#password").val());
  });
}

function startSpruce() {
  $("#connecting").fadeOut();
  $.notify("Starting spruce...", "info");
  backend.send("start_spruce");
  backend.on("key", function(event, key) {
    $("#connecting").fadeOut(function() {
      startSocket(key);
    });
  });
}

function restartSpruce() {
  endSpruce();
  startSpruce();
}

function endSpruce() {
  forced = true;
  $("#main").fadeOut(function() {
    $.notify("Stopping spruce...", "info");
    backend.send("end_spruce");
    $.notify("Sent stop signal to spruce", "success");
    $("#connecting").fadeIn();
    localStorage.dev_key = "";
    delete localStorage.dev_key;
    socket.disconnect() && socket.destroy();
  });
}

function logout() {
  forced = true;
  socket.destroy();
  socket.disconnect();
  $("#main").fadeOut(function() {
    $("#connecting").fadeIn();
  });
}

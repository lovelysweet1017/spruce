const backend = require("electron").ipcRenderer;
const copyToClipboard = require("electron").clipboard.writeText;
var socket;
var connected;
var forced;
var graph = {};
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
    console.log(data);
    const visitors = data.find(x => x.name == "visitors").stats;
    console.log(visitors);
    console.log(visitors.map(x => x.date));
    const options = {
      chart: { type: "area", height: 152, sparkline: { enabled: !0 } },
      colors: ["#3ac47d"],
      stroke: { width: 5, curve: "smooth" },
      markers: { size: 1 },
      tooltip: {
        fixed: { enabled: !1 },
        y: {
          title: {
            formatter: function(t) {
              return "";
            }
          }
        },
        marker: { show: !1 }
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.9,
          stops: [0, 90, 100]
        }
      },
      series: [
        { name: "sessions", data: visitors.map(x => x.amount).reverse() }
      ],
      xaxis: {
        type: "category",
        categories: visitors.map(x => x.date).reverse()
      },
      yaxis: {
        min: 0
      }
    };
    if (graph["visitors"]) graph["visitors"].destroy();
    graph["visitors"] = new ApexCharts(
      document.querySelector("#visitors"),
      options
    );
    graph["visitors"].render();
    visitors.reverse();
    let yesterday =
      visitors[visitors.length - 2 >= 0 ? visitors.length - 2 : 0].amount;
    let now = visitors[visitors.length - 1].amount;
    let percent = Math.round((now / yesterday) * 100);
    let increase = now - yesterday;
    $("#graph-daily").text(percent);
    if (increase >= 0) {
      var symbol = "+";
      $("#graph-daily-amount").addClass("text-success");
    } else {
      $("#graph-daily-amount").removeClass("text-success");
      $("#graph-daily-amount").addClass("text-danger");
      $("#graph-daily-arrow").removeClass("fa-angle-up");
      $("#graph-daily-arrow").addClass(["fa-angle-down", "text-danger"]);

      var symbol = "";
    }
    $("#graph-daily-amount").text(symbol + increase);
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
  socket.on("sockets", function(data) {
    changeStatus("now", data);
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
  setTimeout(() => {
    startSpruce();
  }, 1000);
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

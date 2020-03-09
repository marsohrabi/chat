/*
SENG 513 Assignment 3
Maryam Sohrabi 10077637
Lab section B04
*/

const express = require("express");
const app = express();
const name_generator = require("adjective-adjective-animal");
const moment = require("moment");
let http = require("http").createServer(app);
let io = require("socket.io")(http);

let message_buffer = [];
let active_users = [];

// serve static files from this same directory
app.use(express.static(__dirname));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function (socket) {

  console.log("a user connected");

  socket.on("chat message", function (args) {
    // add sender, color, and message to buffer
    let this_message = {};
    this_message["timestamp"] = moment();
    this_message["sender"] = args["sender"];
    this_message["color"] = args["color"];
    this_message["message"] = args["message"];

    // add this message to the buffer in memory
    message_buffer.push(this_message);

    // remove the oldest message if the buffer length > 200
    if (message_buffer.length > 200) {
      message_buffer.shift();
    }

    let timestamp = moment();

    // emit message to all connected sockets
    io.emit("chat message", { sender: args["sender"], message: args["message"], color: args["color"], timestamp: timestamp });

  });

  // update list of users and send update to all connected sockets
  socket.on("disconnect", function () {
    active_users.splice(active_users.indexOf(socket.username));
    io.emit("user disconnected", { user: socket.nickname });

    send_user_list();

    console.log(socket["nickname"] + " disconnected");
  });

  // new socket setup actions
  socket.on("setup", function (args) {

    let new_user_nickname = "";
    if (args["nickname"]) {
      // if a nickname is specified, check if it"s available
      if (active_users.includes(args["nickname"])) {
        // the nickname is not available, so get a random nickname and assign that to the user
        name_generator(1).then(function (generated_name) {
          active_users.push(generated_name);
          socket.emit("nickname set", { nickname: generated_name, error: "Your old nickname is already taken. You've been named " + generated_name + " instead." });
          new_user_nickname = generated_name;

          socket["nickname"] = new_user_nickname;

          // let all connected sockets know that a new user has joined
          io.emit("new user", { nickname: new_user_nickname });
          send_user_list();
          socket["nickname"] = new_user_nickname;

          send_log(socket);
        });
      } else {
        // the nickname is available
        active_users.push(args["nickname"]);
        socket.emit("nickname set", { nickname: args["nickname"] });
        new_user_nickname = args["nickname"];

        socket["nickname"] = new_user_nickname;

        // let all connected sockets know that a new user has joined
        io.emit("new user", { nickname: new_user_nickname });
        send_user_list();
        socket["nickname"] = new_user_nickname;

        send_log(socket);
      }
    } else {
      name_generator(1).then(function (generated_name) {
        active_users.push(generated_name);
        socket.emit("nickname set", { nickname: generated_name });
        new_user_nickname = generated_name;

        socket["nickname"] = new_user_nickname;

        // let all connected sockets know that a new user has joined
        io.emit("new user", { nickname: new_user_nickname });
        send_user_list();
        socket["nickname"] = new_user_nickname;

        send_log(socket);
      });
    }
  });

  socket.on("set nickname", function (args) {
    if (active_users.includes(args["new"])) {
      // the nickname is not available
      socket.emit("chat error", { message: "This nickname is already taken." });

    } else {
      // the nickname is available
      active_users[active_users.indexOf(socket.nickname)] = args["new"];
      socket.emit("nickname set", { nickname: args["new"] });


      io.emit("changed nickname", { old: socket.nickname, new: args["new"] });
      socket["nickname"] = args["new"];
      io.emit("user list", { active_users: active_users });
    }
  });

});

http.listen(3000, function () {
  console.log("listening on *:3000");
});

function send_log(socket) {
  if (message_buffer.length > 0) {
    socket.emit("chat log", { messages: message_buffer });
  } else {
    socket.emit("chat log", { messages: false });
  }
}

function log_users() {
  console.log(active_users);
}

function send_user_list() {
  io.emit("user list", { active_users: active_users });
}
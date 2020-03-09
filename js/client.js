/*
SENG 513 Assignment 3
Maryam Sohrabi 10077637
Lab section B04
*/

let nickname;
let color = "black";

let error_display = $("#error");
let nickname_display = $("#nickname");
let bottom = document.getElementById("bottom");


$(function () {
    // add a small sleep interval so refreshing the page doesn't cause the
    // user to be given a new nickname before the server can remove the old nickname
    // from its list
    // https://www.geeksforgeeks.org/how-to-add-sleep-wait-function-before-continuing-in-javascript/
    const sleep = milliseconds => {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    sleep(1000).then(() => {

        // get nickname and color cookies
        nickname = getCookie("nickname");
        color = getCookie("color") || "black";

        let socket = io();

        // send existing nickname to server or request a nickname
        if (nickname == null) {
            socket.emit("setup");
        } else {
            socket.emit("setup", { nickname: nickname });
        }

        // change nickname color to existing color
        if (color != "black") {
            nickname_display.css("color", "#" + color);
        }

        // actions after a message is sent
        $("form").submit(function (e) {
            e.preventDefault();
            message = $("#m").val();

            if (message != "") {

                error_display.html("");

                let split_message = message.split(" ");

                // check for nickname change command
                if (split_message[0] == "/nick") {
                    if (!split_message[1]) {
                        error_display.html("Did you mean to change your nickname? Enter '/nick NEW_NICKNAME'");
                    } else {
                        socket.emit("set nickname", { new: message.split(" ")[1] });
                    }

                } else if (split_message[0] == "/nickcolor") { // check for color change command
                    if (!split_message[1]) { // check if a color was supplied
                        error_display.html("Did you mean to change your nickname color? Enter '/nickcolor RRGGBB'");
                    } else if (isHexColor(split_message[1])) { // check if the color is a valid hex color
                        color = split_message[1];
                        nickname_display.css("color", "#" + color);
                        setCookie("color", color);
                    } else {
                        error_display.html("That is not a valid RGB color.");
                    }
                } else if (split_message[0].startsWith("/")) { // check for a command that is not supported
                    error_display.html("Invalid command entered");
                } else {
                    socket.emit("chat message", { sender: nickname, color: color, message: message });
                }

                $("#m").val("");
                return false;
            };
        });

        socket.on("chat log", function (args) {
            if (args.messages) {
                // populate the chat log with existing messages
                for (let i in args.messages) {

                    // show any messages from this user's nickname in bold
                    if (args.messages[i]["sender"] == nickname) {
                        $("#messages_list").append($("<li>").addClass("me").html(
                            moment(args.messages[i]["timestamp"]).format("HH:mm") + " <b><font color='" + args.messages[i]["color"] + "'>" + args.messages[i]["sender"] + "</font>: " + args.messages[i]["message"] + "</b>"));

                    } else {
                        $("#messages_list").append($("<li>").html(
                            moment(args.messages[i]["timestamp"]).format("HH:mm") + " <b><font color='" + args.messages[i]["color"] + "'>" + args.messages[i]["sender"] + "</font></b>: " + args.messages[i]["message"]));

                    }
                }
            }

            // keep chat scrolled to the bottom
            bottom.scrollIntoView(false);
        });

        // actions for when a new user joins the chat
        socket.on("new user", function (args) {
            $("#messages_list").append($("<li>").html(args["nickname"] + " has joined the chat!"));
            bottom.scrollIntoView(false);
        });

        // actions for when a user leaves the chat
        socket.on("user disconnected", function (args) {
            $("#messages_list").append($("<li>").html(args["user"] + " has left the chat!"));
            bottom.scrollIntoView(false);
        });

        // actions for when a user changes their nickname
        socket.on("changed nickname", function (args) {
            $("#messages_list").append($("<li>").html(args["old"] + " changed their nickname to " + args["new"]));
            bottom.scrollIntoView(false);
        });

        // actions for when a nickname change/request is verified by the server
        socket.on("nickname set", function (args) {
            // my nickname was changed
            nickname = args["nickname"];

            // display the error message if one is sent
            if ("error" in args) {
                error_display.html(args["error"]);
            }

            // change the nickname shown to the user and set the nickname cookie
            change_nickname(nickname);
            nickname_display.html("" + nickname);
        });

        // actions for when a chat message is received from the server
        socket.on("chat message", function (args) {
            // display the chat message
            if (args.sender == nickname) {
                $("#messages_list").append($("<li>").addClass("me").html(
                    moment(args["timestamp"]).format("HH:mm") + " <b><font color=\"" + args["color"] + "\">" + args["sender"] + "</font>: " + args["message"] + "</b>"));
            } else {
                $("#messages_list").append($("<li>").html(
                    moment(args["timestamp"]).format("HH:mm") + " <b><font color=\"" + args["color"] + "\">" + args["sender"] + "</font></b>: " + args["message"]));
            }

            // keep chat scrolled to the bottom
            bottom.scrollIntoView(false);
        });

        // actions for when the list of active users changes
        socket.on("user list", function (users_list) {
            let list = $("#users");
            list.html("");  // clear the list

            // remake the list of active users
            for (let i in users_list["active_users"]) {
                list.html(list.html() + "<li>" + users_list["active_users"][i] + "</li>");
            }
        });

        // actions for when a chat error is received
        socket.on("chat error", function (error) {
            error_display.html(error["message"]);
        });
    });

});

// saves the user's nickname in a browser cookie
function change_nickname(new_nickname) {
    setCookie("nickname", new_nickname, 7);
};

/*
Cookie functions from https://www.w3schools.com/js/js_cookies.asp
*/
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// https://stackoverflow.com/questions/8027423/how-to-check-if-a-string-is-a-valid-hex-color-representation/8027444
function isHexColor(hex) {
    return typeof hex === 'string'
        && hex.length === 6
        && !isNaN(Number('0x' + hex))
}

// toggles visibility of the active user list
function toggle_users() {
    $("#users").toggle();
}
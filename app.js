"use strict";

//Other files
let boatsModule = require("./public/javascripts/boats");
let ps = require("./packets_serverside");
let gamesModule = require("./games");

// Imports
var express = require("express");
var http = require("http");
var websocket = require("ws");
var ejs = require("ejs");
var cookies = require("cookie-parser");

// Program arguments
var port = process.env.PORT || 3000;

// Init web server
var app = express();
app.use(cookies());
app.use(express.static(__dirname + "/public"));
var server = http.createServer(app).listen(port);

//Init EJS
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//Redirect requests to correct destination
app.get("/", renderSplash);
app.get("/index", renderSplash);
app.get("/index.html", renderSplash);
app.get("/game", renderGame);
app.get("/game.html", renderGame);

function renderSplash(req, res) {
    res.render('index', {stats: stats, played: getPlayedCookie(req, res)});
}

function renderGame(req, res) {
    res.render('game', {});
}

//Upgrade to web socket server
var wserver = new websocket.Server({server});

//Games state
const games = [];
const players = [];
let queuedplayer = null;

//Track stats
let stats = {
    online: 0,
    games: 0,
    ships: 0
};

//On connect
var nextclientid = 0;
wserver.on("connection", function (socket) {
    //Setup client
    let id = nextclientid++;
    let player = new gamesModule.Player(id, socket, null);
    players.push(player);
    console.log("[" + id + "]> Connected!");

    //Stats
    stats.online++;

    socket.on("message", function (msg) {
        let packet = JSON.parse(msg);
        console.log("[" + id + "]> " + msg);
        handlePacket(socket, player, packet);
    });

    socket.on("close", function () {
        console.log("[" + id + "]> Disconnected!");

        //Stats
        stats.online--;

        //If the player is in a game, abort the game
        let game = games.find(function (game) {
            return game.playerstate1.player === player || game.playerstate2.player === player;
        });

        //Set player to not connected
        player.isConnected = false;

        if (game != null && game.status !== "FINISHED") {
            //Abort the game
            game.status = "ABORTED";

            //Abort all players that are still connected
            if (game.playerstate1.player.isConnected) {
                ps.ABORT(game.playerstate1.player);
            }
            if (game.playerstate2.player.isConnected) {
                ps.ABORT(game.playerstate2.player);
            }
        }
    });
});

function handlePacket(socket, player, packet) {
    //START_GAME
    if (packet.packet === "START_GAME") {
        //Set player name
        player.name = packet.name;

        //Check if the queued player is still connected
        if (queuedplayer !== null && !queuedplayer.isConnected)
            queuedplayer = null;

        //Check if there is a queued player
        if (queuedplayer === null) {
            //No queued player, queue the player
            queuedplayer = player;
        } else {
            //Create playerstate A
            let playera = queuedplayer;
            let playerStateA = new gamesModule.PlayerState(playera, []);

            //Clear queued player
            queuedplayer = null;

            //Create playerstate B
            let playerb = player;
            let playerStateb = new gamesModule.PlayerState(playerb, []);

            //Generate turn
            let turn = Math.random() >= 0.5 ? "A" : "B";

            //Create game
            let game = new gamesModule.Game(playerStateA, playerStateb, turn, "SETUP");
            games.push(game);

            //Track stats
            stats.games++;

            //Send assign game packets
            ps.ASSIGN_GAME(playera, playerb.name);
            ps.ASSIGN_GAME(playerb, playera.name);
        }
    }
    //READY
    else if (packet.packet === "READY") {
        //Find the game that the player is playing
        let game = games.find(function (game) {
            return game.playerstate1.player === player || game.playerstate2.player === player;
        });
        let playerstate_p = game.playerstate1.player === player ? game.playerstate1 : game.playerstate2;
        let playerstate_o = game.playerstate1.player === player ? game.playerstate2 : game.playerstate1;

        //Get and set boats
        let boats = packet.boats;
        //Assign boats to BoatLocation
        boats.forEach(function (boat) {
            boat.__proto__ = boatsModule.BoatLocation.prototype;
        });
        playerstate_p.boats = boats;

        //Check if both players are ready
        playerstate_p.ready = true;
        if (playerstate_o.ready) {
            //Create START packet
            ps.START(game.playerstate1.player, game.turn === "A" ? "YOU" : "OPPONENT");
            ps.START(game.playerstate2.player, game.turn === "B" ? "YOU" : "OPPONENT");
            //Set game status to playing
            game.status = "PLAYING";
        }
    }
    //SHOT
    else if (packet.packet === "SHOT") {
        //Find the game that the player is playing
        let game = games.find(function (game) {
            return game.playerstate1.player === player || game.playerstate2.player === player;
        });
        let playerstate_p = game.playerstate1.player === player ? game.playerstate1 : game.playerstate2;
        let playerstate_o = game.playerstate1.player === player ? game.playerstate2 : game.playerstate1;

        //Obtain shot location
        let locrow = packet.location_row;
        let loccol = packet.location_col;

        //Check if player has a game
        if (game === null) {
            console.log("Received invalid shot packet from " + player.id + " (not in a game)");
            ps.SHOT_REPLY(player, locrow, loccol, "INVALID");
            return;
        }

        //Check if game is playing
        if (game.status !== "PLAYING") {
            console.log("Received invalid shot packet from " + player.id + " (game status not PLAYING)");
            ps.SHOT_REPLY(player, locrow, loccol, "INVALID");
            return;
        }

        //Check if it's not the players turn
        if (!(game.turn === "A" && game.playerstate1.player === player ||
            game.turn === "B" && game.playerstate2.player === player)) {
            console.log("Received invalid shot packet from " + player.id + " (not your turn)");
            ps.SHOT_REPLY(player, locrow, loccol, "INVALID");
            return;
        }

        //Check if player has already shot there
        if (playerstate_p.shots[locrow][loccol]) {
            console.log("Received invalid shot packet from " + player.id + " (already shot there)");
            ps.SHOT_REPLY(player, locrow, loccol, "INVALID");
            return;
        }

        //Check whether the shot was a hit
        let is_hit = false;
        playerstate_o.boats.forEach(function (boat) {
            if (boat.isOnBoat(loccol, locrow)) is_hit = true;
        });

        //Track stats
        if (is_hit) stats.ships++;

        //Switch turns
        if (!is_hit) game.turn = game.turn === "A" ? "B" : "A";

        //Shoot
        playerstate_p.shots[locrow][loccol] = true;
        ps.SHOT_REPLY(player, locrow, loccol, is_hit ? "HIT" : "MISS");
        ps.SHOT_ENEMY(playerstate_o.player, locrow, loccol, is_hit ? "HIT" : "MISS");

        //Check if the player has won
        if (hasWon(playerstate_o.boats, playerstate_p.shots)) {
            //Set game status
            game.status = "FINISHED";

            //Notify players
            ps.FINISH(player, "YOU");
            ps.FINISH(playerstate_o.player, "OPPONENT");
        }
    }
}

function hasWon(boats, shots) {
    //Loop through boats
    for (let boat of boats) {
        for (let tile of boat.tiles()) {
            if (!shots[tile.y][tile.x]) return false;
        }
    }
    //All boats are shot
    return true;
}

function getPlayedCookie(req, res) {
    let played = req.cookies["played"];
    if(played == undefined) played = 0;
    played++;
    res.cookie("played", played);
    return played;
}
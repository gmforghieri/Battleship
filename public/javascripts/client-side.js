"use strict";
//The boats of the player
let boats = [];

//Global variables
let turn = null;
let status = "QUEUE"; //SETUP/SETUP-READY

//Setup boat selection code
let selectedboat = null;
let selectedrotation = "HORIZONTAL";

//turn
function setTurn(newTurn) {
    turn = newTurn;
    $("#turn").html(turn === "YOU" ? "Your Turn" : "Opponent's turn");
}

//Quit button
function QuitClick() {
    window.location.replace("/");
}

//Fullscreen button
function toggleFullScreen() {
    if ((document.fullScreenElement && document.fullScreenElement !== null) ||    
     (!document.mozFullScreen && !document.webkitIsFullScreen)) {
      if (document.documentElement.requestFullScreen) {  
        document.documentElement.requestFullScreen();  
      } else if (document.documentElement.mozRequestFullScreen) {  
        document.documentElement.mozRequestFullScreen();  
      } else if (document.documentElement.webkitRequestFullScreen) {  
        document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);  
      }  
    } else {  
      if (document.cancelFullScreen) {  
        document.cancelFullScreen();  
      } else if (document.mozCancelFullScreen) {  
        document.mozCancelFullScreen();  
      } else if (document.webkitCancelFullScreen) {  
        document.webkitCancelFullScreen();  
      }  
    }  
  }

//On ready button click
function onReadyClick() {
    if (status === "SETUP") {

        //Check if all boats are placed
        if (boats.length !== boatSettings.length) {
            if (confirm("You have not placed all boats. Do you want to place the rest randomly?")) {
                //If not, place all the remaining boats randomly
                for (let i = 0; i < boatSettings.length; i++) {
                    //Check if the boat is already placed, if so, continue.
                    if ($("#setup").children().eq(i).css("display") === "none") continue;
                    let boatSetting = boatSettings[i];
                    //Keep generating random positions, and check if the position is valid
                    loop1:
                        while (true) {
                            let x = Math.floor(Math.random() * 10);
                            let y = Math.floor(Math.random() * 10);
                            let rot = Math.random() >= 0.5 ? "HORIZONTAL" : "VERTICAL";
                            let newboat = new BoatLocation(boatSetting, rot, x, y);

                            //Check if new boat is within boundaries
                            if (rot === "HORIZONTAL") {
                                if (x + boatSetting.length - 1 >= 10) {
                                    continue;
                                }
                            }
                            //Else vertical rotation
                            else {
                                if (y + boatSetting.length - 1 >= 10) {
                                    continue;
                                }
                            }

                            //Check if new boat is overlapping with an existing one
                            for (let i = 0; i < boats.length; i++) {
                                let boat = boats[i];
                                if (boat.overlapsWith(newboat)) {
                                    continue loop1
                                }
                            }

                            //The boat is valid, add it
                            boats.push(newboat);

                            //Go out of loop
                            break;
                        }
                }
                //Visually update the board
                updateBoard(boats);
                //Clear the setup
                $("#setup").html("");
            } else {
                return;
            }
        }
        status = "SETUP-READY";
        READY(boats);
        $("#ready").html("You are ready");
        $("#ready").toggleClass("changed");
    }
}

//
function updateBoard(boats) {
    //Clear board
    clearTableCells("#yourtable");
    //Place boats
    for (let i = 0; i < boats.length; i++) {
        drawBoat(boats[i]);
    }
}

//
function drawBoat(boatloc) {
    if (boatloc.rotation === "HORIZONTAL") {
        for (let x = boatloc.x; x < boatloc.x + boatloc.length; x++) {
            let imgpos = boatloc.boatSetting.imgPosition + (x - boatloc.x);
            setTableCell("#yourtable", boatloc.y, x, imgpos, false, false);
        }
    }
    //Rotation Vertical
    else {
        for (let y = boatloc.y; y < boatloc.y + boatloc.length; y++) {
            let imgpos = boatloc.boatSetting.imgPosition + (y - boatloc.y);
            setTableCell("#yourtable", y, boatloc.x, imgpos, false, true);
        }
    }
}

function clearTableCells(table) {
    $(table + " td").css("background-image", "");
}

function drawHit(table, row, col, hit) {
    let cell = $(table).find("tr").eq(row + 1).find("td").eq(col);
    //if it is on a boat, change the boat to hit
    if (hit) {
        cell.css("background-position-y", "0");
    } else {
        setTableCell(table, row, col, 17, true, false);
    }

}

function setTableCell(table, row, col, imgx, shot, rotated) {
    let cell = $(table).find("tr").eq(row + 1).find("td").eq(col);

    //If it's an X, use html instead
    if (imgx === 17 && shot === true) {
        cell.html("✕");
        cell.css("font-size", "25px");
        cell.css("font-weight", "bolder");
        return;
    }

    cell.css("background-image", "url(/images/battleships.png)");
    cell.css("background-position-x", imgx * -35 + "px");
    cell.css("background-position-y", shot ? "0" : "-35px");
    cell.css("transform", rotated ? "rotate(90deg)" : "");
}


//receiveing event datas
let socket = new WebSocket("ws://" + location.host);
socket.onmessage = function (event) {
    let packet = JSON.parse(event.data);
    console.log("[]" + event.data);
    handlePacket(socket, packet);
};

function updateBoardInclFake(tile) {
    // return if not valid
    if (status !== "SETUP") return;
    if (selectedboat === null) return;

    //get location
    let col = $(tile).index() - 1;
    let row = $(tile).parent().index() - 1;
    let boatSetting = boatSettings[selectedboat];

    // Remove old fake boats
    updateBoard(boats);

    //Add fake boat
    let fakeboat = new BoatLocation(boatSetting, selectedrotation, col, row);
    drawBoat(fakeboat);
}

//Client receives and handles
function handlePacket(socket, packet) {

    //Assign Game
    if (packet.packet === "ASSIGN_GAME") {
        //Status setup
        status = "SETUP";

        //Put the boats on the board
        updateBoard(boats);

        //Remove queue screen, show own board, hide enemies board, show setup
        $("#screen-queue").css("display", "none");
        $("#screen-game").css("display", "block");
        $(".show-game").css("display", "none");
        $(".show-setup").css("display", "block");

        //Show boats in the setup on the right
        for (let i = 0; i < boatSettings.length; i++) {
            let boatSetting = boatSettings[i];
            $("#setup").append("<div class='boat' id='boat-" + i + "'></div>");
            let boat = $("#boat-" + i);
            boat.css("background-image", "url(/images/battleships.png)");
            boat.css("background-position-x", boatSetting.imgPosition * -35 + "px");
            boat.css("background-position-y", "-35px");
            boat.css("background-size", "630px");
            boat.css("width", (boatSetting.length * 35) + "px");
            boat.css("height", "35px")
        }

        //On click of a boat
        $(".boat").click(function () {
            selectedboat = $(this).index();
            console.log("Selected boat " + selectedboat);

            //Apply selected class to boat
            $(".boat").removeClass("selected");
            $(this).addClass("selected");
        });

        //On hover of a tile
        $("#yourtable td").hover(function (e) {
            updateBoardInclFake(this);
        });

        //On click of a tile
        $("#yourtable td").click(function (e) {
            // return if not valid
            if (status !== "SETUP") return;
            if (selectedboat === null) return;

            //get location
            let col = $(this).index() - 1;
            let row = $(this).parent().index() - 1;
            let boatSetting = boatSettings[selectedboat];

            //Create temporary boatlocation
            let newboat = new BoatLocation(boatSetting, selectedrotation, col, row);

            //Boats can not overlap
            for (let i = 0; i < boats.length; i++) {
                let boat = boats[i];
                if (boat.overlapsWith(newboat)) {
                    alert("Boats cannot overlap!");
                    return;
                }
            }

            //Boats inside the boundaries of the board
            if (selectedrotation === "HORIZONTAL") {
                if (col + boatSetting.length - 1 >= 10) {
                    alert("Cannot place boat out of the boundaries of the board");
                    return;
                }
            }
            //Else vertical rotation
            else {
                if (row + boatSetting.length - 1 >= 10) {
                    alert("Cannot place boat out of the boundaries of the board");
                    return;
                }
            }

            //Put boat on board
            boats.push(newboat);
            updateBoard(boats);

            //boats on the side disappear when placed
            $("#setup").children().eq(selectedboat).css("display", "none");

            //boat can only be placed once
            selectedboat = null;


        });
        //right click, switch boat direction
        $("#yourtable td").contextmenu(function (e) {
            // return if not valid
            if (status !== "SETUP") return;
            if (selectedboat === null) return;

            selectedrotation = (selectedrotation === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL");

            updateBoardInclFake(this);


            return false;
        });
    }


    if (packet.packet === "START") {
        setTurn(packet.turn);
        status = "PLAYING";

        //Hide setup, show enemies board
        $(".show-setup").css("display", "none");
        $(".show-game").css("display", "block");
    }

    //Shot reply
    if (packet.packet === "SHOT_REPLY") {
        if (packet.reply === "INVALID") {
            alert("This action was invalid. Please make sure that it's your turn and you are not targeting already shot locations. Please try again");
            return;
        }
        //Draw either a hit or an X, depending on whether it's a hit
        setTableCell("#enemytable", packet.location_row, packet.location_col, 17, packet.reply !== "HIT", false);
        setTurn(packet.reply === "HIT" ? "YOU" : "OPPONENT");
    }

    //Enemy shots
    if (packet.packet === "SHOT_ENEMY") {
        drawHit("#yourtable", packet.location_row, packet.location_col, packet.reply === "HIT");
        setTurn(packet.reply === "HIT" ? "OPPONENT" : "YOU");
    }

    //Update Status, abortion
    if (packet.packet === "ABORT") {
        alert("Your opponent has left the game, you will be redirected to the main page");
        window.location.replace("/");
        status = "ABORTED";
    }
    //update status, game finished
    if (packet.packet === "FINISH") {
        status = "FINISHED";

        if (packet.winner === "YOU") {
            alert("Congratulations! You have won this game!");
            window.location.replace("/");
        } else {
            alert("Unfortunately, you have lost. Better luck next time!");
            window.location.replace("/");
        }
    }
}

$("#enemytable td").click(function (e) {
    let col = $(this).index() - 1;
    let row = $(this).parent().index() - 1;
    SHOT(row, col);
});

//Client sends
//Start Game
socket.onopen = function () {
    START_GAME("Anonymous");
};




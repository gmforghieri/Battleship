//Start game
function START_GAME(name) {
    sendPacket({
        packet: "START_GAME",
        name: name,
    });
}

//Shot
function SHOT(location_row, location_col) {
    sendPacket({
        packet: "SHOT",
        location_col: location_col,
        location_row: location_row,
    });
}

//Ready client
function READY(boats) {
    sendPacket({
        packet: "READY",
        boats: boats,
    });
}

//Send packet
function sendPacket(packet) {
    let str = JSON.stringify(packet);
    socket.send(str);
}


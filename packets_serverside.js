exports.ASSIGN_GAME = function (player, opname) {
    sendPacket(player, {
        packet: "ASSIGN_GAME",
        opname: opname
    });
};

exports.START = function (player, turn) {
    sendPacket(player, {
        packet: "START",
        turn: turn
    });
};

exports.SHOT_REPLY = function (player, location_row, location_col, reply) {
    sendPacket(player, {
        packet: "SHOT_REPLY",
        location_row: location_row,
        location_col: location_col,
        reply: reply
    });
};

exports.SHOT_ENEMY = function (player, location_row, location_col, reply) {
    sendPacket(player, {
        packet: "SHOT_ENEMY",
        location_row: location_row,
        location_col: location_col,
        reply: reply
    });
};

exports.ABORT = function (player) {
    sendPacket(player, {
        packet: "ABORT"
    });
};

exports.FINISH = function (player, winner) {
    sendPacket(player, {
        packet: "FINISH",
        winner: winner,
    });
};

function sendPacket(player, packet) {
    console.log("[" + player.id + "]< " + JSON.stringify(packet));
    player.socket.send(JSON.stringify(packet));
}
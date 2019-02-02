class Player {
    constructor(id, socket, name) {
        this.id = id;
        this.socket = socket;
        this.name = name;
        this.isConnected = true;
    }
}

class PlayerState {
    constructor(player, boats) {
        this.player = player;
        this.boats = boats; //Array of BoatLocation
        this.shots = generateEmptyShots(10);
        this.ready = false;
    }
}

function generateEmptyShots(size) {
    let shots = [];
    for (let i = 0; i < size; i++) {
        shots[i] = new Array(size).fill(false);
    }
    return shots;
}

class Game {
    constructor(playerstate1, playerstate2, turn, status) {
        this.playerstate1 = playerstate1;
        this.playerstate2 = playerstate2;
        this.turn = turn; // A or B
        this.status = status; //[QUEUE]/SETUP/[SETUP-READY]/PLAYING/FINISHED/ABORTED
    }
}

module.exports = {
    Game: Game,
    Player: Player,
    PlayerState: PlayerState
};
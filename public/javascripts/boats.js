let boatSettings = [
    {imgPosition: 0, length: 5},
    {imgPosition: 5, length: 4},
    {imgPosition: 9, length: 3},
    {imgPosition: 12, length: 3},
    {imgPosition: 15, length: 2},
];

//Class for boatlocation
class BoatLocation {
    constructor(boatSetting, rotation, x, y) {
        this.boatSetting = boatSetting;
        this.length = boatSetting.length;
        this.rotation = rotation; // HORIZONTAL/VERTICAL
        this.x = x;
        this.y = y;
    }
}

//function for determining whether a click targeted a boat
BoatLocation.prototype.isOnBoat = function (x, y) {
    if (this.rotation === "HORIZONTAL") {
        //Check if the shot was on the boat
        return this.y === y && x >= this.x && x < (this.x + this.length);
    } else {
        return this.x === x && y >= this.y && y < (this.y + this.length);
    }
};

BoatLocation.prototype.overlapsWith = function (otherboat) {
    let tiles = this.tiles();
    for (let i = 0; i < tiles.length; i++) {
        let tile = tiles[i];
        if (otherboat.isOnBoat(tile.x, tile.y)) return true;
    }
    return false;
};

//Function that returns an array of tiles
BoatLocation.prototype.tiles = function () {
    let tilearray = [];
    if (this.rotation === "HORIZONTAL") {
        //Loop through all x coordinates of the boat
        for (let x = this.x; x < this.x + this.length; x++) {
            tilearray.push({x: x, y: this.y});
        }
    } else {
        //Loop through all y coordinates of the boat
        for (let y = this.y; y < this.y + this.length; y++) {
            tilearray.push({x: this.x, y: y});
        }
    }
    return tilearray;
};

//Fuction that returns true if there is any boat at this location
function isOnBoat(boats, x, y) {
    for (let i = 0; i < boats.length; i++) {
        if (boats[i].isOnBoat(x, y)) return true;
    }
    return false;
}

module.exports = {
    BoatLocation: BoatLocation,
    boatSettings: boatSettings,
    isOnBoat: isOnBoat
};
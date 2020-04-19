(function () {
    'use strict';

    let game = new Snake();
    let gameSetting = document.getElementById("game-settings");
    let playButton = document.getElementById("play");

    playButton.addEventListener("click", function () {
        console.log("Name: ", this.value);
    });

    function setSettings() {
        let row = parseInt(rowLength.value), cell = parseInt(cellLength.value);

        game.setDifficulty(parseInt(difficulty.value));
        game.setGameArea(row > 15 ? row : 16, cell > 15 ? cell : 16);
    }
})();
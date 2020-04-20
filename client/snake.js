'use strict';
const {PlayRequest, ActionRequest, MoveRequest, Direction, Point} = require('./snake_pb.js');
const {SnakeClient} = require('./snake_grpc_web_pb.js');

function NewSnakeStatus(className) {
    return {
        cells: [], 
        direction: Direction.UP, 
        className: "cell "+className,
        updateTimeout: null
    }
}

let Snake = function (url) {
    let self = this;
    
    self.snake = [];
    self.snake1 = NewSnakeStatus("player1");
    self.snake2 = NewSnakeStatus("player2");
    self.player1 = {name: "Player 1", score: 0};
    self.player2 = {name: "Player 2", score: 0};
    self.difficulty = 7;
    self.gameArea = document.getElementsByClassName('game-area')[0];
    self.loader = document.getElementsByClassName('loader')[0];
    self.boardWidth = 64;
    self.boardHeight = 48;
    self.interval1 = null;
    self.interval2 = null;
    self.gameStarted = false;
    self.score = 0;
    self.bait = {
        x: null,
        y: null
    };
    self.client = new SnakeClient(url, null, null);
    self.playerId = "";
    self.roomId = "";

    document.onkeydown = function (event) {
        if (self.gameStarted) {
            switch (event.key) {
                case "ArrowUp":
                    if (self.snake1.direction !== Direction.DOWN) {
                        self.snake1.direction = Direction.UP;
                    }
                    break;
                case "ArrowDown":
                    if (self.snake1.direction !== Direction.UP) {
                        self.snake1.direction = Direction.DOWN;
                    }
                    break;
                case "ArrowLeft":
                    if (self.snake1.direction !== Direction.RIGHT) {
                        self.snake1.direction = Direction.LEFT;
                    }
                    break;
                case "ArrowRight":
                    if (self.snake1.direction !== Direction.LEFT) {
                        self.snake1.direction = Direction.RIGHT;
                    }
                    break;
            }
            self.sendMove(self.snake1)
        }
    };
};

/**
 * Move the snake
 */
Snake.prototype.move = function (snake) {
    let self = this;
    let firstSnakeCell = snake.cells[0];
    let lastSnakeCell = snake.cells[snake.cells.length - 1];
    // let cellCoordinates = "[data-x='" + lastSnakeCell.x + "'][data-y='" + lastSnakeCell.y + "']";
    let newSnakeCell = {};
    let x, y;

    switch (snake.direction) {
        case Direction.LEFT:
            x = firstSnakeCell.x - 1;
            newSnakeCell.x = x < 0 ? self.boardWidth -1 : x;
            newSnakeCell.y = firstSnakeCell.y;
            break;
        case Direction.RIGHT:
            x = firstSnakeCell.x + 1;
            newSnakeCell.x = x > self.boardWidth - 1 ? 0 : x;
            newSnakeCell.y = firstSnakeCell.y;
            break;
        case Direction.UP:
            y = firstSnakeCell.y - 1;
            newSnakeCell.x = firstSnakeCell.x;
            newSnakeCell.y = y < 0 ? self.boardHeight - 1 : y;
            break;
        case Direction.DOWN:
            y = firstSnakeCell.y + 1;
            newSnakeCell.x = firstSnakeCell.x;
            newSnakeCell.y = y > self.boardHeight - 1 ? 0 : y;
            break;
    }

    // Unpaint last snake cell's element background 
    let cell = self.getCellByPoint(lastSnakeCell);
    if (!cell) {
        console.error("Cell not found: ", lastSnakeCell, snake.className)
    } else {
        cell.setAttribute('class', 'cell');        
    }

    //Make first snake cell's elenment background player1
    cell = self.getCellByPoint(newSnakeCell);
    if (!cell) {
        console.error("Cell not found: ", newSnakeCell, snake.className)
    } else {
        cell.setAttribute('class', snake.className);
    }

    if (newSnakeCell.x != self.bait.x || newSnakeCell.y != self.bait.y) {
        // Remove last snake cell if hasn't eaten the bait
        snake.cells.splice(snake.cells.length - 1, 1);
    }

    // Add new cell to head of the snake
    snake.cells.unshift(newSnakeCell);
};

Snake.prototype.getCellByPoint = function(point) {
    return document.querySelector(`[data-x='${point.x}'][data-y='${point.y}']`)
}

/**
 * Create new bait
 */
Snake.prototype.renderBait = function () {
    let self = this;
    // let prevBait = document.getElementsByClassName("bait");
    // if (prevBait.length > 0) {
    //     prevBait[0].classList.remove("bait");
    // }
    self.getCellByPoint(self.bait).classList.add("bait");
};

Snake.prototype.sendMove = function(snake) {
    let self = this;
    clearTimeout(snake.updateTimeout);
    let request = new MoveRequest();
    let cells = snake.cells.map(o => {
        let p = new Point();
        p.setX(o.x);
        p.setY(o.y);
        return p;
    });
    request.setRoomid(this.roomId);
    request.setPlayerid(this.playerId);
    request.setDir(snake.direction)
    request.setSnakeList(cells)
    // console.log("Calling SendMove", snake.direction, cells);
    self.client.sendMove(request, {}, (err, response) => {
      console.log({
        actionId: response.getActionid(), 
      });
    });
    snake.updateTimeout = setTimeout(function () {
        // console.log("Sending update for ", snake.className);
        self.sendMove(snake);
    }, 500);
}

/**
 * Creates game area 
 */
Snake.prototype.createGameArea = function () {
    let self = this;
    let rowElement, cellElement;

    if (!self.gameArea) {
        console.log("#game-area id element is required!");
        return;
    }

    self.gameArea.innerHTML = '';

    for (let rowi = 0; rowi < self.boardHeight; rowi++) {
        rowElement = document.createElement('div');
        rowElement.setAttribute('class', 'row');

        for (let celli = 0; celli < self.boardWidth; celli++) {
            cellElement = document.createElement('div');
            cellElement.setAttribute('class', 'cell');
            cellElement.setAttribute('data-y', rowi);
            cellElement.setAttribute('data-x', celli);
            rowElement.append(cellElement);
        }

        self.gameArea.append(rowElement);
    }

    self.hideLoader();
    self.gameArea.classList.remove("hidden");
    self.renderBait();    
    self.renderSnake(self.snake1);
    self.renderSnake(self.snake2);
};

Snake.prototype.isSnakeCell = function(cell, snake) {
    cellX = cell.getAttribute('data-x');
    cellY = cell.getAttribute('data-y');

    for (let i=0,l=snake.cells.length;i<l;i++) {
        if (snake.cells[i].x == cellX && snale.cells[i].y == cellY) {
            return true;
        }
    }
    return false;
}

/**
 * Renders game area.
 */
Snake.prototype.renderSnake = function(snake, newCells) {
    if (newCells) {
        for (let i=0,l=snake.cells.length;i<l;i++) {
            this.getCellByPoint(snake.cells[i])
                .setAttribute('class', 'cell');
        }
        snake.cells = newCells;
    }
    // console.log("Drawing new snake", snake.cells)
    for (let i=0,l=snake.cells.length;i<l;i++) {
        let cell = this.getCellByPoint(snake.cells[i])
        if (cell) {
            cell.setAttribute('class', snake.className);
        }
    }
};

Snake.prototype.getGameRoom = async function(name) {
    let self = this;
    let request = new PlayRequest();
    request.setPlayername(name);
    return new Promise((resolve, reject) => {
        self.client.getGameRoom(request, {}, (err, response) => {
            if (err !== null) {
              reject(err);
            } else {
              resolve(response);   
            }
          })
    });
}

Snake.prototype.showLoader = function() {
    this.loader.classList.remove("hidden");
}

Snake.prototype.hideLoader = function() {
    this.loader.classList.add("hidden");
}

Snake.prototype.getGameUpdate = function() {
    let self = this;
    let streamRequest = new ActionRequest();
    streamRequest.setRoomid(self.roomId);
    streamRequest.setPlayerid(self.playerId);
    
    let stream = self.client.getGameUpdates(streamRequest, {});
    stream.on('data', (response) => {
        self.player1.score = response.getPlayer1points();
        self.player2.score = response.getPlayer2points();
        if (response.getBait().toObject() !== self.bait) {
            self.bait = response.getBait().toObject();
            self.renderBait();    
        }
        // console.log({
        //     player1Points:  self.player1.score,
        //     player2Points: self.player2.score,
        //     bait: self.bait,
        //     snake2: self.snake2.cells,
        //     gameEnded: response.getGameended()
        //     });
        self.renderSnake(self.snake2, response.getSnake2List()
            .map(p => p.toObject()));
        self.setContentByClass("score-player1", self.player1.score)
        self.setContentByClass("score-player2", self.player2.score)
        if (response.getGameended()) {
            self.endGame();
        }
    });    
}

Snake.prototype.setupGame = function(setup) {
    let self = this;
    self.roomId = setup.getRoomid();
    self.playerId = setup.getPlayerid();
    self.boardWidth = setup.getBoardwidth();
    self.boardHeight = setup.getBoardheight();
    self.player2.name = setup.getPlayer2name();
    self.snake1.cells = setup.getSnake1List().map(p => p.toObject());
    self.snake2.cells = setup.getSnake2List().map(p => p.toObject());
    self.bait = setup.getBait().toObject();
    self.setContentByClass("player2-name", self.player2.name);
}

Snake.prototype.setContentByClass = function(className, content) {
    let elems = document.getElementsByClassName(className)
    for (let i=0;i<elems.length;i++) {
        elems[i].innerHTML = content
    }
}

Snake.prototype.sendStartGame = async function() {
    let self = this;
    var request = new ActionRequest();
    request.setRoomid(this.roomId);
    request.setPlayerid(this.playerId);
    console.log("Calling StartGame", self.playerId);
    return new Promise((resolve, reject) => {
        self.client.startGame(request, {}, (err, response) => {
            if (err !== null) {
                reject(err);
            } else {
                console.log({
                    actionId: response.getActionid()
                });
                self.gameStarted = true;
                resolve(response);   
            }
          });
    });
}

/**
 * Start the game
 */
Snake.prototype.startGame = function() {
    let self = this;
    self.createGameArea();
    self.sendStartGame()
        .then((res) => {
            self.getGameUpdate()
            self.interval1 = setInterval(function () {
                self.move(self.snake1);
            }, 500 / self.difficulty);   
            self.snake1.updateTimeout = setTimeout(function () {
                self.sendMove(self.snake1);
            }, 500);        

            // self.interval2 = setInterval(function () {
            //     self.move(self.snake2);
            // }, 500 / self.difficulty);        
        })
        .catch(err => console.error(err));
}

Snake.prototype.showMatch = function() {
    let self = this;
    let matchDialog = document.getElementById('match-dialog');
    matchDialog.classList.remove("hidden")
    let startCounter = document.getElementById("start-counter");
    let counter = 4;
    let interval = 1000;
    for (var i = 0; i < counter; i++) {
        setTimeout(function () {
            startCounter.innerHTML = --counter;
            if (counter == 0) {
                matchDialog.classList.add("hidden")
                self.startGame();
            }
        }, i * interval)
    }
}

/**
 * Connect to the server
 */
Snake.prototype.connect = function(name) {
    let self = this;
    self.player1.name = name;
    self.setContentByClass("player1-name", name);
    self.showLoader();
    self.getGameRoom(name)
    .then((gameRoom) => {
        self.setupGame(gameRoom)
        self.hideLoader()
        self.showMatch()
        // self.startGame(gameRoom)
    })
    .catch(err => console.error(err));
}

/**
 * Stop the game
 */
Snake.prototype.stopGame = function () {
    let self = this;
    self.gameStarted = false;
    clearInterval(self.interval1);
    clearInterval(self.interval2);
    clearTimeout(self.snake1.updateTimeout);
    clearTimeout(self.snake2.updateTimeout);
};

/**
 * Ends the game
 */
Snake.prototype.endGame = function () {
    // alert('Game Over!! Yout score is ' + this.score);
    document.getElementById("overlay").classList.remove("hidden");
    document.getElementById("game-over").classList.remove("hidden");
    this.stopGame();
};


function main() {
    'use strict';

    let game = new Snake('http://' + window.location.hostname + ':8080');
    let gameSetting = document.getElementById("game-settings");
    let connectButton = document.getElementById("connect");

    function handleInput() {
        let name = document.getElementById("name").value.trim()
        if (name == "") {
            alert("Please enter a name or alias to play")
        } else {
            gameSetting.classList.add("hidden")
            game.connect(name)
        }
    }

    connectButton.addEventListener("click", handleInput);
    document.getElementById("name")
        .addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
          event.preventDefault();
          handleInput()
        }
    });

    gameSetting.classList.add("hidden")
    game.connect("Pablo "+Math.floor(Math.random()*100))
}

main();
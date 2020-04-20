'use strict';
const {PlayRequest, ActionRequest, MoveRequest, Direction, Point, Snake} = require('./snake_pb.js');
const {SnakeServiceClient} = require('./snake_grpc_web_pb.js');

function NewSnakeStatus(className) {
    return {
        cells: [], 
        direction: Direction.UP, 
        className: "cell "+className,
        updateTimeout: null
    }
}

let SnakeGame = function (url) {
    let self = this;
    
    self.snake = [];
    self.playerIdx = 0;
    self.snakes = [NewSnakeStatus("player1"), NewSnakeStatus("player2")]
    // self.snake1 = NewSnakeStatus("player1");
    // self.snake2 = NewSnakeStatus("player2");
    self.players = [{name: "Player 1", score: 0, className: "player1"}, {name: "Player 2", score: 0, className: "player2"}]
    // self.player1 = {name: "Player 1", score: 0};
    // self.player2 = {name: "Player 2", score: 0};
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
    self.client = new SnakeServiceClient(url, null, null);
    self.playerId = "";
    self.roomId = "";
    self.ended = false;

    document.onkeydown = function (event) {
        if (self.gameStarted) {
            switch (event.key) {
                case "ArrowUp":
                    if (self.snakes[self.playerIdx].direction !== Direction.DOWN) {
                        self.snakes[self.playerIdx].direction = Direction.UP;
                    }
                    break;
                case "ArrowDown":
                    if (self.snakes[self.playerIdx].direction !== Direction.UP) {
                        self.snakes[self.playerIdx].direction = Direction.DOWN;
                    }
                    break;
                case "ArrowLeft":
                    if (self.snakes[self.playerIdx].direction !== Direction.RIGHT) {
                        self.snakes[self.playerIdx].direction = Direction.LEFT;
                    }
                    break;
                case "ArrowRight":
                    if (self.snakes[self.playerIdx].direction !== Direction.LEFT) {
                        self.snakes[self.playerIdx].direction = Direction.RIGHT;
                    }
                    break;
            }
            self.sendMove(self.snakes[self.playerIdx])
        }
    };
};

/**
 * Move the snake
 */
SnakeGame.prototype.move = function (snake) {
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

SnakeGame.prototype.getCellByPoint = function(point) {
    return document.querySelector(`[data-x='${point.x}'][data-y='${point.y}']`)
}

/**
 * Create new bait
 */
SnakeGame.prototype.renderBait = function () {
    let self = this;
    // let prevBait = document.getElementsByClassName("bait");
    // if (prevBait.length > 0) {
    //     prevBait[0].classList.remove("bait");
    // }
    self.getCellByPoint(self.bait).classList.add("bait");
};

SnakeGame.prototype.sendMove = function(snake) {
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
    let s = new Snake();
    s.setCellsList(cells);
    s.setDir(snake.direction);
    // request.setDir(snake.direction)
    // request.setSnakeList(cells)
    request.setSnake(s)
    // console.log("Calling SendMove", snake.direction, cells);
    self.client.sendMove(request, {}, (err, response) => {
        if (err) {
            console.error(err)
        }
        //  else {
        //     console.log("SendMove", {
        //         actionId: response.getActionid(), 
        //     });
        // }
    });
    if (!self.ended) {
        snake.updateTimeout = setTimeout(function () {
            // console.log("Sending update for ", snake.className);
            self.sendMove(snake);
        }, 500);
    }
}

/**
 * Creates game area 
 */
SnakeGame.prototype.createGameArea = function () {
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
    for (let i=0,l=self.snakes.length;i<l;i++) {
        console.log("CreateGameArea, rendering snake", i, self.snakes[i])
        self.renderSnake(self.snakes[i]);
    }
    // self.renderSnake(self.snake1);
    // self.renderSnake(self.snake2);
};

SnakeGame.prototype.isSnakeCell = function(cell, snake) {
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
SnakeGame.prototype.renderSnake = function(snake, newCells) {
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

SnakeGame.prototype.getGameRoom = async function(name) {
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

SnakeGame.prototype.showLoader = function() {
    this.loader.classList.remove("hidden");
}

SnakeGame.prototype.hideLoader = function() {
    this.loader.classList.add("hidden");
}

SnakeGame.prototype.getGameUpdate = function() {
    let self = this;
    let streamRequest = new ActionRequest();
    streamRequest.setRoomid(self.roomId);
    streamRequest.setPlayerid(self.playerId);
    
    let stream = self.client.getGameUpdates(streamRequest, {});
    stream.on('data', (response) => {
        response.getScoresList().map((score, idx) => {
            self.players[idx].score = score;
            self.setContentByClass(`score-player${idx+1}`, score)
        })
        let ended = response.getGameended();
        if (!ended && response.getBait().toObject() !== self.bait) {
            self.bait = response.getBait().toObject();
            self.renderBait();    
        }
        response.getSnakesList().map((snake, idx) => {
            if (idx!==self.playerIdx) {
                self.renderSnake(self.snakes[idx], snake.getCellsList().map(p => p.toObject()))
            }
        })
        if (ended) {
            console.log("Game ended!")
            self.endGame();
        }
    }).on('end', function(end) {
        console.log("Updates finished!", end)
    });    
}

SnakeGame.prototype.setupGame = function(setup) {
    let self = this;
    self.roomId = setup.getRoomid();
    self.playerId = setup.getPlayerid();
    self.playerIdx = setup.getPlayeridx();
    self.boardWidth = setup.getBoardwidth();
    self.boardHeight = setup.getBoardheight();
    console.log("PlayerId", self.playerId);
    setup.getPlayernamesList().map((name, idx) => {
        self.players[idx].name = name;
        self.setContentByClass(`player${idx+1}-name`, name);
    });
    setup.getSnakesList().map((snake, idx) => {
        self.snakes[idx].cells = snake.getCellsList().map(p => p.toObject());
        self.snakes[idx].direction = snake.getDir();
    });
    self.bait = setup.getBait().toObject();
}

SnakeGame.prototype.setContentByClass = function(className, content) {
    let elems = document.getElementsByClassName(className)
    for (let i=0;i<elems.length;i++) {
        elems[i].innerHTML = content
    }
}

SnakeGame.prototype.sendStartGame = async function() {
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
                console.log("Start Game", {
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
SnakeGame.prototype.startGame = function() {
    let self = this;
    self.ended = false;
    self.createGameArea();
    self.sendStartGame()
        .then((res) => {
            self.getGameUpdate()
            self.interval1 = setInterval(function () {
                self.move(self.snakes[self.playerIdx]);
            }, 500 / self.difficulty);   
            self.snakes[self.playerIdx].updateTimeout = setTimeout(function () {
                self.sendMove(self.snakes[self.playerIdx]);
            }, 500);        

            // self.interval2 = setInterval(function () {
            //     self.move(self.snake2);
            // }, 500 / self.difficulty);        
        })
        .catch(err => console.error(err));
}

SnakeGame.prototype.showMatch = function() {
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
SnakeGame.prototype.connect = function(name) {
    let self = this;
    self.showLoader();
    self.getGameRoom(name)
    .then((gameRoom) => {
        self.setupGame(gameRoom)
        self.hideLoader()
        self.showMatch()
    })
    .catch(err => console.error(err));
}

/**
 * Stop the game
 */
SnakeGame.prototype.stopGame = function () {
    let self = this;
    self.gameStarted = false;
    clearInterval(self.interval1);
    // clearInterval(self.interval2);
    self.snakes.map(s=>clearTimeout(s))
};

/**
 * Ends the game
 */
SnakeGame.prototype.endGame = function () {
    self.ended = true;
    document.getElementById("overlay").classList.remove("hidden");
    document.getElementById("game-over").classList.remove("hidden");
    this.stopGame();
};


function main() {
    'use strict';

    let game = new SnakeGame('http://' + window.location.hostname + ':8080');
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

    // gameSetting.classList.add("hidden")
    // game.connect("Pablo "+Math.floor(Math.random()*100))
}

main();
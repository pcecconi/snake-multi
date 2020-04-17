const {PlayRequest, ActionRequest, MoveRequest, Direction} = require('./snake_pb.js');
const {SnakeClient} = require('./snake_grpc_web_pb.js');

var client = new SnakeClient('http://' + window.location.hostname + ':8080',
                               null, null);

// simple unary call
let roomId = null;
let playerId = null;
let snake = null;

function play(name) {
  console.log("Calling GetGameRoom");
  let request = new PlayRequest();
  request.setPlayername(name);
  client.getGameRoom(request, {}, (err, response) => {
    if (err !== null) {
      console.log(err);
    } else {
      playerId = response.getPlayerid();
      roomId = response.getRoomid();
      console.log({
        roomId: response.getRoomid(), 
        playerId: response.getPlayerid(),
        boardWidth: response.getBoardwidth(), 
        boardHeight: response.getBoardheight(),
        player2Name: response.getPlayer2name(),
        snake1: response.getSnake1List(),
        snake2: response.getSnake2List(),
        bait: response.getBait()
      });
      startGame(response.getRoomid(), response.getPlayerid())
      getGameUpdates(response.getRoomid(), response.getPlayerid());
    }
  });
}

function startGame(roomId, playerId) {
  var request = new ActionRequest();
  request.setRoomid(roomId);
  request.setPlayerid(playerId);
  console.log("Calling StartGame", playerId);
  client.startGame(request, {}, (err, response) => {
    console.log({
      actionId: response.getActionid(), 
    });
  });
}

function abortGame(roomId, playerId) {
  var request = new ActionRequest();
  request.setRoomid(roomId);
  request.setPlayerid(playerId);
  console.log("Calling AbortGame", playerId);
  client.abortGame(request, {}, (err, response) => {
    console.log({
      player1Points: response.getPlayer1points(),
      player2Points: response.getPlayer2points(),
      bait: response.getBait(),
      snake2: response.getSnake2List(),
      gameEnded: response.getGameended()
    }); 
  });
}

// server streaming call
function getGameUpdates(roomId, playerId) {
  var streamRequest = new ActionRequest();
  streamRequest.setRoomid(roomId);
  streamRequest.setPlayerid(playerId);
  
  var stream = client.getGameUpdates(streamRequest, {});
  stream.on('data', (response) => {
    console.log({
      player1Points: response.getPlayer1points(),
      player2Points: response.getPlayer2points(),
      bait: response.getBait(),
      snake2: response.getSnake2List(),
      gameEnded: response.getGameended()
    });
    snake = response.getSnake2List();
  });    
}
  
// Send Moves
function sendMove(roomId, playerId, dir, snake) {
  var request = new MoveRequest();
  request.setRoomid(roomId);
  request.setPlayerid(playerId);
  request.setDir(dir)
  request.setSnakeList(snake)
  console.log("Calling SendMove", dir);
  client.sendMove(request, {}, (err, response) => {
    console.log({
      actionId: response.getActionid(), 
    });
  });
}

/*
var p1 = new Point();
p1.setX(3);
p1.setY(8);
var p2 = new Point();
p2.setX(1);
p2.setY(4);
var moves = [{dir: 1, pos: p1}, {dir: 4, pos: p2}]
setTimeout(()=> sendPosUpdate("ROOM1", playerId, moves[0].pos), 300);
setTimeout(()=> sendMove("ROOM1", playerId, moves[0]), 500);
setTimeout(()=> sendPosUpdate("ROOM1", playerId, moves[1].pos), 1200);
setTimeout(()=> sendMove("ROOM1", playerId, moves[1]), 1500);
*/
play("Pablo "+Math.floor(Math.random()*100))
setTimeout(()=> sendMove(roomId, playerId, Direction.LEFT, snake), 500);
setTimeout(()=> abortGame(roomId, playerId), 10000);
/*
// deadline exceeded
var deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 1);

client.sayHelloAfterDelay(request, {deadline: deadline.getTime()},
  (err, response) => {
    console.log('Got error, code = ' + err.code +
                ', message = ' + err.message);
  });
  */

package gameroom

import (
	"fmt"
	"log"
	"sync"

	"github.com/google/uuid"
	pb "github.com/pcecconi/snake-multi/proto"
	"github.com/pcecconi/snake-multi/server/commons"
)

const initialSnakeLength = 8

// Service structure persist service status
type Service struct {
	rooms         map[string]*Game
	actionCounter int32
	mux           sync.Mutex
}

// NewService initializes a structure that allows you to use the services
// of this package
func NewService() Service {
	return Service{rooms: make(map[string]*Game)}
}

func makeInitialSnake(head pb.Point) Snake {
	var res Snake
	res.movingDirection = pb.Direction_UP
	for i := head.Y; i < head.Y+initialSnakeLength; i++ {
		res.Cells = append(res.Cells, &pb.Point{X: head.X, Y: i})
	}
	return res
}

func getStartingSnakes(width, height int32) (Snake, Snake) {
	var head1, head2 pb.Point
	head1.X = int32(width / 3)
	head1.Y = int32(height/2) - int32(initialSnakeLength/2)
	head2.X = int32(width/3) * 2
	head2.Y = head1.Y
	return makeInitialSnake(head1), makeInitialSnake(head2)
}

func newGameRoom(boardWidth, boardHeight int32, user1 *commons.User, user2 *commons.User) *Game {
	roomID := uuid.New()
	snake1, snake2 := getStartingSnakes(boardWidth, boardHeight)
	fmt.Println("Initial Snake1", snake1.String())
	fmt.Println("Initial Snake2", snake2.String())
	gs := &Game{
		RoomID:      roomID,
		boardWidth:  boardWidth,
		boardHeight: boardHeight,
		Player1:     Player{user1, 0, snake1, make(chan pb.GameUpdate)},
		Player2:     Player{user2, 0, snake2, make(chan pb.GameUpdate)},
		Bait:        nil,
		Ended:       false,
	}
	gs.newBait()
	return gs
}

// GetGameRoom returns a structure that represents the game status and
// allow to interact
func (s *Service) GetGameRoom(boardWidth, boardHeight int32, user1 *commons.User, user2 *commons.User) *Game {
	s.mux.Lock()
	defer s.mux.Unlock()
	gs := newGameRoom(boardWidth, boardHeight, user1, user2)
	s.rooms[gs.RoomID.String()] = gs
	return gs
}

// StartGame is used for a player to signal it has started playing
func (s *Service) StartGame(roomID, playerID string) pb.ActionAck {
	s.mux.Lock()
	defer s.mux.Unlock()
	game, ok := s.rooms[roomID]
	if !ok {
		return pb.ActionAck{ActionId: -1}
	}
	go game.play(playerID)
	s.actionCounter++
	return pb.ActionAck{ActionId: s.actionCounter}
}

// AbortGame is used for a player to signal it has started playing
func (s *Service) AbortGame(roomID, playerID string) (pb.GameUpdate, error) {
	s.mux.Lock()
	defer s.mux.Unlock()
	game, ok := s.rooms[roomID]
	if !ok {
		return pb.GameUpdate{}, fmt.Errorf("Invalid game room ID %s", roomID)
	}
	player, _, err := game.getPlayers(playerID)
	if err != nil {
		return pb.GameUpdate{}, err
	}
	game.abort()
	return game.getGameUpdate(player), nil
}

// GetGameUpdates returns updates on the other players movements, bait position and points.
func (s *Service) GetGameUpdates(roomID, playerID string) (chan pb.GameUpdate, error) {
	game, ok := s.rooms[roomID]
	if !ok {
		return nil, fmt.Errorf("Invalid roomId: %s", roomID)
	}
	player, otherPlayer, err := game.getPlayers(playerID)
	if err != nil {
		return nil, err
	}
	log.Println("Starting updates for player %s", playerID)
	s.mux.Lock()
	defer s.mux.Unlock()
	go game.sendUpdates(otherPlayer, player.Updates)
	return player.Updates, nil
}

// SendMove is used for receiving a player's move
func (s *Service) SendMove(roomID, playerID string, dir pb.Direction, snake []*pb.Point) pb.ActionAck {
	gs, ok := s.rooms[roomID]
	if !ok {
		return pb.ActionAck{ActionId: -1}
	}
	var player *Player
	if playerID == gs.Player1.User.ID.String() {
		player = &gs.Player1
	}
	if playerID == gs.Player2.User.ID.String() {
		player = &gs.Player2
	}
	if player == nil {
		return pb.ActionAck{ActionId: -1}
	}
	s.mux.Lock()
	defer s.mux.Unlock()
	player.Snake.movingDirection = dir
	player.Snake.Cells = snake
	s.actionCounter++
	return pb.ActionAck{ActionId: s.actionCounter}
}

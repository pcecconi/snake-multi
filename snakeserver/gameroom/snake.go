package gameroom

import (
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	pb "github.com/pcecconi/snake-multi/proto"
	"github.com/pcecconi/snake-multi/snakeserver/commons"
)

const pointsPerBait int32 = 10

// moves freq:  500ms / gameSpeed
const gameSpeed = 7

// Player represents a user in a game
type Player struct {
	User    *commons.User
	Points  int32
	Snake   Snake
	Updates chan pb.GameUpdate
}

// Snake represents a snake on the board
type Snake struct {
	Cells           []*pb.Point
	movingDirection pb.Direction
}

func (s *Snake) String() string {
	r := []string{}
	for _, cell := range s.Cells {
		r = append(r, serializePoint(cell))
	}
	return strings.Join(r, ", ")
}

// Game reflects the current game status
type Game struct {
	RoomID      uuid.UUID
	boardWidth  int32
	boardHeight int32
	Player1     Player
	Player2     Player
	Bait        *pb.Point
	Ended       bool
	mux         sync.Mutex
}

func (gs *Game) newBait() {
	fmt.Println("Generating new bait")
	rand.Seed(time.Now().UnixNano())
	bait := pb.Point{
		X: int32(rand.Intn(int(gs.boardWidth))),
		Y: int32(rand.Intn(int(gs.boardHeight))),
	}
	fmt.Println("Proposed bait: ", serializePoint(&bait))
	if crashed(&bait, &gs.Player1.Snake) || crashed(&bait, &gs.Player2.Snake) {
		gs.newBait()
	}
	// gs.mux.Lock()
	gs.Bait = &bait
	// gs.mux.Unlock()
}

func (gs *Game) getNewSnakeCell(s *Snake) *pb.Point {
	firstSnakeCell := s.Cells[0]
	newSnakeCell := &pb.Point{X: firstSnakeCell.X, Y: firstSnakeCell.Y}

	switch s.movingDirection {
	case pb.Direction_UP:
		newSnakeCell.Y = firstSnakeCell.Y - 1
		if newSnakeCell.Y < 0 {
			newSnakeCell.Y = gs.boardHeight - 1
		}
	case pb.Direction_DOWN:
		newSnakeCell.Y = firstSnakeCell.Y + 1
		if newSnakeCell.Y == gs.boardHeight {
			newSnakeCell.Y = 0
		}
	case pb.Direction_LEFT:
		newSnakeCell.X = firstSnakeCell.X - 1
		if newSnakeCell.X < 0 {
			newSnakeCell.X = gs.boardWidth - 1
		}
	case pb.Direction_RIGHT:
		newSnakeCell.X = firstSnakeCell.X + 1
		if newSnakeCell.X == gs.boardWidth {
			newSnakeCell.X = 0
		}
	}
	return newSnakeCell
}

func crashed(newCell *pb.Point, s *Snake) bool {
	for _, cell := range s.Cells {
		if newCell.X == cell.X && newCell.Y == cell.Y {
			return true
		}
	}
	return false
}

func serializePoint(p *pb.Point) string {
	return fmt.Sprintf("(%d %d)", p.GetX(), p.GetY())
}

func (gs *Game) move(p *Player) {
	// fmt.Println("Moving player", p.User.ID, p.Snake.movingDirection)
	// fmt.Println("Snake length", len(p.Snake.Cells))
	newSnakeCell := gs.getNewSnakeCell(&p.Snake)

	gs.mux.Lock()
	defer gs.mux.Unlock()
	// Check if snake crashed
	if crashed(newSnakeCell, &gs.Player1.Snake) || crashed(newSnakeCell, &gs.Player2.Snake) {
		fmt.Println("Snakes crash! Ending game!")
		fmt.Println("New cell:", serializePoint(newSnakeCell))
		fmt.Println("Snake1", gs.Player1.Snake.String())
		fmt.Println("Snake2", gs.Player2.Snake.String())
		gs.Ended = true
		return
	}

	// If snake eats bait, create new bait, else continue the game
	// fmt.Printf("Head: %s, Bait: %s", serializePoint(newSnakeCell), serializePoint(gs.Bait))
	if newSnakeCell.X == gs.Bait.X && newSnakeCell.Y == gs.Bait.Y {
		fmt.Printf("Player %s ate bait!\n", p.User.ID.String())
		gs.newBait()
		p.Points += pointsPerBait
		fmt.Printf("New Bait: %s, Points: %d", serializePoint(gs.Bait), p.Points)
	} else {
		// Remove last snake cell
		p.Snake.Cells = p.Snake.Cells[:len(p.Snake.Cells)-1]
	}

	// Add new cell to head of the snake
	p.Snake.Cells = append([]*pb.Point{newSnakeCell}, p.Snake.Cells...)
	// fmt.Println("New Head pos", p.Snake.Cells[0])
}

func (gs *Game) play(playerID string) error {
	player, _, err := gs.getPlayers(playerID)
	if err != nil {
		return err
	}
	// log.Printf("Starting play for player %s (%s)", player.User.ID.String(), player.User.Name)
	for {
		gs.move(player)
		if gs.Ended {
			return nil
		}
		time.Sleep((500 / gameSpeed) * time.Millisecond)
	}
}

func (gs *Game) getGameUpdate(player *Player) pb.GameUpdate {
	gs.mux.Lock()
	defer gs.mux.Unlock()
	return pb.GameUpdate{
		Player1Points: gs.Player1.Points,
		Player2Points: gs.Player2.Points,
		Bait:          gs.Bait,
		Snake2:        player.Snake.Cells,
		GameEnded:     gs.Ended,
	}
}

func (gs *Game) sendUpdates(player *Player, updates chan<- pb.GameUpdate) error {
	for {
		gameUpdate := gs.getGameUpdate(player)
		gs.mux.Lock()
		updates <- gameUpdate
		gs.mux.Unlock()
		if gs.Ended {
			close(updates)
			return nil
		}
		time.Sleep((500 / gameSpeed) * time.Millisecond)
	}
}

func (gs *Game) getPlayers(playerID string) (*Player, *Player, error) {
	var otherPlayer, player *Player
	if playerID == gs.Player1.User.ID.String() {
		player = &gs.Player1
		otherPlayer = &gs.Player2
	}
	if playerID == gs.Player2.User.ID.String() {
		player = &gs.Player2
		otherPlayer = &gs.Player1
	}
	if player == nil {
		return nil, nil, fmt.Errorf("Invalid player %s", playerID)
	}
	return player, otherPlayer, nil
}

func (gs *Game) abort() {
	fmt.Println("Abort game, ending...")
	gs.mux.Lock()
	gs.Ended = true
	gs.mux.Unlock()
}

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
	Score   int32
	Snake   pb.Snake
	Updates chan pb.GameUpdate
}

// Snake represents a snake on the board
// type Snake struct {
// 	Cells           []*pb.Point
// 	movingDirection pb.Direction
// }

// Snake2String Returns a string representation of a snake
func Snake2String(s *pb.Snake) string {
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
	Players     []*Player
	// Player1     Player
	// Player2     Player
	Bait  *pb.Point
	Ended bool
	mux   sync.Mutex
}

// GetPlayerByStringID Finds a player by the string version of its uuid
func (gs *Game) GetPlayerByStringID(id string) *Player {
	for _, p := range gs.Players {
		if p.User.ID.String() == id {
			return p
		}
	}
	return nil
}

func (gs *Game) newBait() {
	fmt.Println("Generating new bait")
	rand.Seed(time.Now().UnixNano())
	bait := pb.Point{
		X: int32(rand.Intn(int(gs.boardWidth))),
		Y: int32(rand.Intn(int(gs.boardHeight))),
	}
	fmt.Println("Proposed bait: ", serializePoint(&bait))
	overSnake := false
	for _, p := range gs.Players {
		if crashed(&bait, &p.Snake) {
			overSnake = true
			break
		}
	}
	if overSnake {
		gs.newBait()
	}
	// gs.mux.Lock()
	gs.Bait = &bait
	// gs.mux.Unlock()
}

func (gs *Game) getNewSnakeCell(s *pb.Snake) *pb.Point {
	firstSnakeCell := s.Cells[0]
	newSnakeCell := &pb.Point{X: firstSnakeCell.X, Y: firstSnakeCell.Y}

	switch s.Dir {
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

func crashed(newCell *pb.Point, s *pb.Snake) bool {
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
	snakeCrash := false
	for _, p := range gs.Players {
		if crashed(newSnakeCell, &p.Snake) {
			snakeCrash = true
			break
		}
	}
	// if crashed(newSnakeCell, &gs.Player1.Snake) || crashed(newSnakeCell, &gs.Player2.Snake) {
	if snakeCrash {
		fmt.Println("Snakes crash! Ending game!")
		// fmt.Println("New cell:", serializePoint(newSnakeCell))
		// fmt.Println("Snake1", gs.Player1.Snake.String())
		// fmt.Println("Snake2", gs.Player2.Snake.String())
		gs.Ended = true
		return
	}

	// If snake eats bait, create new bait, else continue the game
	// fmt.Printf("Head: %s, Bait: %s", serializePoint(newSnakeCell), serializePoint(gs.Bait))
	if newSnakeCell.X == gs.Bait.X && newSnakeCell.Y == gs.Bait.Y {
		fmt.Printf("Player %s ate bait!\n", p.User.ID.String())
		gs.newBait()
		p.Score += pointsPerBait
		fmt.Printf("New Bait: %s, Points: %d", serializePoint(gs.Bait), p.Score)
	} else {
		// Remove last snake cell
		p.Snake.Cells = p.Snake.Cells[:len(p.Snake.Cells)-1]
	}

	// Add new cell to head of the snake
	p.Snake.Cells = append([]*pb.Point{newSnakeCell}, p.Snake.Cells...)
	// fmt.Println("New Head pos", p.Snake.Cells[0])
}

func (gs *Game) play(playerID string) error {
	player := gs.GetPlayerByStringID(playerID)
	if player == nil {
		return fmt.Errorf("Invalid player id %s", playerID)
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
	scores := []int32{}
	snakes := []*pb.Snake{}
	for _, p := range gs.Players {
		scores = append(scores, p.Score)
		if p != player {
			snakes = append(snakes, &p.Snake)
		} else {
			snakes = append(snakes, &pb.Snake{})
		}
	}
	return pb.GameUpdate{
		Scores:    scores,
		Bait:      gs.Bait,
		Snakes:    snakes,
		GameEnded: gs.Ended,
	}
}

func (gs *Game) sendUpdates(player *Player) error {
	for {
		gameUpdate := gs.getGameUpdate(player)
		gs.mux.Lock()
		player.Updates <- gameUpdate
		gs.mux.Unlock()
		if gs.Ended {
			close(player.Updates)
			return nil
		}
		time.Sleep((500 / gameSpeed) * time.Millisecond)
	}
}

func (gs *Game) abort() {
	fmt.Println("Abort game, ending...")
	gs.mux.Lock()
	gs.Ended = true
	gs.mux.Unlock()
}

package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net"
	"sync"

	"google.golang.org/grpc"

	pb "github.com/pcecconi/snake-multi/proto"
	"github.com/pcecconi/snake-multi/snakeserver/commons"
	"github.com/pcecconi/snake-multi/snakeserver/gameroom"
	"github.com/pcecconi/snake-multi/snakeserver/matcher"
)

var (
	port        = flag.Int("port", 9090, "The server port")
	boardWidth  = flag.Int("width", 80, "The board width")
	boardHeight = flag.Int("height", 80, "The board height")
)

type snakeServer struct {
	pb.UnimplementedSnakeServer
	matcher            matcher.Service
	gameRoom           gameroom.Service
	defaultBoardWidth  int32
	defaultBoardHeight int32
	gameRooms          map[string]*gameroom.Game
	mu                 sync.Mutex // protects routeNotes
}

func (s *snakeServer) assignGameRoom(match *matcher.Match) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok1 := s.gameRooms[match.User1.ID.String()]
	_, ok2 := s.gameRooms[match.User2.ID.String()]
	if ok1 || ok2 {
		return fmt.Errorf("Users already have game room assigned")
	}
	gr := s.gameRoom.GetGameRoom(
		s.defaultBoardWidth,
		s.defaultBoardHeight,
		match.User1,
		match.User2,
	)
	s.gameRooms[match.User1.ID.String()] = gr
	s.gameRooms[match.User2.ID.String()] = gr
	return nil
}

// GetGameRoom returns a GameSetup.
func (s *snakeServer) GetGameRoom(ctx context.Context, req *pb.PlayRequest) (*pb.GameSetup, error) {
	user := commons.NewUser(req.PlayerName)
	res := s.matcher.MatchUser(&user)
	match := <-res
	s.assignGameRoom(match)
	gr := s.gameRooms[user.ID.String()]
	// User always is Player1 so we have to map the other to Player2
	var player2Name string
	var snake1, snake2 []*pb.Point
	if user.ID == match.User1.ID {
		player2Name = match.User2.Name
		snake1 = gr.Player1.Snake.Cells
		snake2 = gr.Player2.Snake.Cells
	} else {
		player2Name = match.User1.Name
		snake1 = gr.Player2.Snake.Cells
		snake2 = gr.Player1.Snake.Cells
	}
	return &pb.GameSetup{
		RoomId:      gr.RoomID.String(),
		BoardWidth:  s.defaultBoardWidth,
		BoardHeight: s.defaultBoardHeight,
		PlayerId:    user.ID.String(),
		Player2Name: player2Name,
		Snake1:      snake1,
		Snake2:      snake2,
		Bait:        gr.Bait,
	}, nil
}

// StartGame is the message that starts movement for a player
func (s *snakeServer) StartGame(ctx context.Context, req *pb.ActionRequest) (*pb.ActionAck, error) {
	ack := s.gameRoom.StartGame(req.RoomId, req.PlayerId)
	return &ack, nil
}

// AbortGame is the message used by player to end game
func (s *snakeServer) AbortGame(ctx context.Context, req *pb.ActionRequest) (*pb.GameUpdate, error) {
	update, err := s.gameRoom.AbortGame(req.RoomId, req.PlayerId)
	if err != nil {
		return nil, err
	}
	return &update, nil
}

// GetGameUpdate returns updates on the other players movements, bait position and points.
func (s *snakeServer) GetGameUpdates(req *pb.ActionRequest, stream pb.Snake_GetGameUpdatesServer) error {
	updates, err := s.gameRoom.GetGameUpdates(req.RoomId, req.PlayerId)
	for upd := range updates {
		if err := stream.Send(&upd); err != nil {
			return err
		}
	}
	return err
}

// SendMove receives a move, updates internals and returns ack.
func (s *snakeServer) SendMove(ctx context.Context, req *pb.MoveRequest) (*pb.ActionAck, error) {
	ack := s.gameRoom.SendMove(req.RoomId, req.PlayerId, req.Dir, req.Snake)
	return &ack, nil
}

func serialize(point *pb.Point) string {
	return fmt.Sprintf("%d %d", point.X, point.Y)
}

func newServer(boardWidth, boardHeight int) *snakeServer {
	s := &snakeServer{
		matcher:            matcher.NewService(),
		gameRoom:           gameroom.NewService(),
		defaultBoardWidth:  int32(boardWidth),
		defaultBoardHeight: int32(boardHeight),
		gameRooms:          make(map[string]*gameroom.Game),
	}
	return s
}

func main() {
	flag.Parse()
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	var opts []grpc.ServerOption
	grpcServer := grpc.NewServer(opts...)
	pb.RegisterSnakeServer(grpcServer, newServer(*boardWidth, *boardHeight))
	grpcServer.Serve(lis)
}

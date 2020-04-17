package matcher

import (
	"sync"

	"github.com/pcecconi/snake-multi/server/commons"
)

// Match holds information about a pair of commons.Users
type Match struct {
	User1 *commons.User
	User2 *commons.User
}

// Service structure persist service status
type Service struct {
	match   chan *Match
	pending chan *Match
	mux     sync.Mutex
}

// NewService initializes a structure that allows you to use the services
// of this package
func NewService() Service {
	return Service{match: make(chan *Match, 2), pending: make(chan *Match, 1)}
}

// MatchUser is the main function of this package and allows you to get
// a match between two commons.Users
func (s *Service) MatchUser(user *commons.User) chan *Match {
	s.mux.Lock()
	defer s.mux.Unlock()
	select {
	case pending := <-s.pending:
		pending.User2 = user
		s.match <- pending
		s.match <- pending
	default:
		s.pending <- &Match{User1: user}
	}
	return s.match
}

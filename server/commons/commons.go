package commons

import "github.com/google/uuid"

// User holds information about a user
type User struct {
	ID   uuid.UUID
	Name string
}

// NewUser creates a new commons.User by generating an ID
func NewUser(name string) User {
	return User{ID: uuid.New(), Name: name}
}

# Online Multiplayer Snake
This is a 2 players online version of the classic Snake game.
It's written in Golang using gRPC as a communication protocol 
and it has a web interface for the game client.

## Running the Game
After cloning the repo just issue a:
```
$ docker-compose up
```

This will start 3 containers:

- Snake Server on port 9090
- Envoy Proxy on port 8080
- Web server on port 8081

Once the containers are up and running you can enter the 
game by opening `http://localhost:8081` on any web browser.

## Development 
Before being able to running the services in development mode you
need to install the required dependencies.

### Dependencies
The following dependencies need to be installed:

- Golang
- Setup `GOPATH` and add `~/go` to `PATH` in `.bash_profile` or `.zprofile` depending on your OS shell.
- Protocol Buffers (https://github.com/protocolbuffers/protobuf/releases)
- Protocol Buffers Web Support (https://github.com/grpc/grpc-web/releases). Follow installation instructions from https://github.com/grpc/grpc-web
- Docker

### Development cycle
To facilitate development a `Makefile` is included with several 
useful comands:

- `install-deps`: Will install clients dependencies. Needed before 
running the client.
- `start-client`: Will compile and start the client using a simple
http python web server
- `start-server`: Will run the snake server locally (without docker)
- `start-proxy`: Will start the Envoy container that you can leave 
running in the background during development (it's required for using
web gRPC)
- `protos`: Builds the protocol buffers interfaces for Goland and Javascript. You should run this command every time you change the 
protocols definitions.

install-deps :
	cd client; npm install

protos :
	protoc -I proto/ proto/snake.proto --go_out=plugins=grpc:proto
	protoc -I=proto/ proto/snake.proto --js_out=import_style=commonjs:proto --grpc-web_out=import_style=commonjs,mode=grpcwebtext:proto
	mv proto/*.js client

build-client :
	cd client; npx webpack snake.js

start-client : protos build-client
	# docker build -t snake/client -f ./client.Dockerfile .
	# docker run --rm -it -p 8081:80 snake/client
	cd client; python2 -m SimpleHTTPServer 8081

start-server: protos
	# docker build -t snake/server -f ./server.Dockerfile .
	# docker run -d -p 9090:9090 snake/server
	go run snakeserver/server.go

start-proxy: 
	docker build -t snake/envoy -f ./envoy.Dockerfile .
	docker run -d -p 8080:8080 -p 9901:9901 snake/envoy
install-deps :
	cd client; npm install

protos :
	protoc -I proto/ proto/snake.proto --go_out=plugins=grpc:proto
	protoc -I=proto/ proto/snake.proto --js_out=import_style=commonjs:proto --grpc-web_out=import_style=commonjs,mode=grpcwebtext:proto
	mv proto/*.js client

build-client :
	cd client; npx webpack snake.js

start-client : build-client
	cd client; python2 -m SimpleHTTPServer 8081
protos :
	protoc -I proto/ proto/snake.proto --go_out=plugins=grpc:proto
	protoc -I=proto/ proto/snake.proto --js_out=import_style=commonjs:proto --grpc-web_out=import_style=commonjs,mode=grpcwebtext:proto
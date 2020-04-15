/**
 * @fileoverview gRPC-Web generated client stub for snake
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.snake = require('./snake_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.snake.SnakeClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options['format'] = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.snake.SnakePromiseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options['format'] = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.snake.PlayRequest,
 *   !proto.snake.GameSetup>}
 */
const methodDescriptor_Snake_GetGameRoom = new grpc.web.MethodDescriptor(
  '/snake.Snake/GetGameRoom',
  grpc.web.MethodType.UNARY,
  proto.snake.PlayRequest,
  proto.snake.GameSetup,
  /**
   * @param {!proto.snake.PlayRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.snake.GameSetup.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.snake.PlayRequest,
 *   !proto.snake.GameSetup>}
 */
const methodInfo_Snake_GetGameRoom = new grpc.web.AbstractClientBase.MethodInfo(
  proto.snake.GameSetup,
  /**
   * @param {!proto.snake.PlayRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.snake.GameSetup.deserializeBinary
);


/**
 * @param {!proto.snake.PlayRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.snake.GameSetup)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.snake.GameSetup>|undefined}
 *     The XHR Node Readable Stream
 */
proto.snake.SnakeClient.prototype.getGameRoom =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/snake.Snake/GetGameRoom',
      request,
      metadata || {},
      methodDescriptor_Snake_GetGameRoom,
      callback);
};


/**
 * @param {!proto.snake.PlayRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.snake.GameSetup>}
 *     A native promise that resolves to the response
 */
proto.snake.SnakePromiseClient.prototype.getGameRoom =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/snake.Snake/GetGameRoom',
      request,
      metadata || {},
      methodDescriptor_Snake_GetGameRoom);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.snake.UpdateRequest,
 *   !proto.snake.GameUpdate>}
 */
const methodDescriptor_Snake_GetGameUpdates = new grpc.web.MethodDescriptor(
  '/snake.Snake/GetGameUpdates',
  grpc.web.MethodType.SERVER_STREAMING,
  proto.snake.UpdateRequest,
  proto.snake.GameUpdate,
  /**
   * @param {!proto.snake.UpdateRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.snake.GameUpdate.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.snake.UpdateRequest,
 *   !proto.snake.GameUpdate>}
 */
const methodInfo_Snake_GetGameUpdates = new grpc.web.AbstractClientBase.MethodInfo(
  proto.snake.GameUpdate,
  /**
   * @param {!proto.snake.UpdateRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.snake.GameUpdate.deserializeBinary
);


/**
 * @param {!proto.snake.UpdateRequest} request The request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!grpc.web.ClientReadableStream<!proto.snake.GameUpdate>}
 *     The XHR Node Readable Stream
 */
proto.snake.SnakeClient.prototype.getGameUpdates =
    function(request, metadata) {
  return this.client_.serverStreaming(this.hostname_ +
      '/snake.Snake/GetGameUpdates',
      request,
      metadata || {},
      methodDescriptor_Snake_GetGameUpdates);
};


/**
 * @param {!proto.snake.UpdateRequest} request The request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!grpc.web.ClientReadableStream<!proto.snake.GameUpdate>}
 *     The XHR Node Readable Stream
 */
proto.snake.SnakePromiseClient.prototype.getGameUpdates =
    function(request, metadata) {
  return this.client_.serverStreaming(this.hostname_ +
      '/snake.Snake/GetGameUpdates',
      request,
      metadata || {},
      methodDescriptor_Snake_GetGameUpdates);
};


module.exports = proto.snake;


/*
  The Transporter just ferries messages to and from the server.
*/
define(['crystal/common/api', 'crystal/server/loop', 'underscore'], function (CrystalApi, crystalLoop, _) {

  var initialize = function (io) {
    listenForApi(io);
    listenForClient(io);
  }

  var listenForApi = function (io) {

    // Listen for Api Broadcast Request
    CrystalApi.Subscribe('broadcast', function (data) {
      var socket, x, receivedAt;
      for(x in io.sockets.sockets){
        socket = io.sockets.sockets[x];
        socket.get('receivedAt', function (err, receivedAt) {
          if(receivedAt){
            data.receivedAt = receivedAt;
          }
          socket.emit('message', data); 
        });
      }
    });

    // Listen for Api sending message to single client
    CrystalApi.Subscribe('messageToClient', function (data) {
      var socket, x;
      // could not get _.find() to work!?
      //socket = _.find(io.sockets.sockets, function (s) {s.id === data.socketId});
      for(x in io.sockets.sockets){
        socket = io.sockets.sockets[x];
        if(socket.id === data.socketId){break;}
      }
      delete data.socketId;
      socket.emit('message', data);
    });

  }

  var listenForClient = function (io) {
    io.sockets.on('connection', function (socket) {
      // Tell API we have a new connection
      CrystalApi.Publish('socketConnected', { socketId: socket.id });

      // Listen for client disconnection.
      socket.on('disconnect', function () {
        CrystalApi.Publish('socketDisconnected', {socketId: socket.id});
      });

      // Listen for client messages
      socket.on('message', function(data) {
        if(data.sentAt){
          socket.set('receivedAt', data.sentAt);
        }
        var publishTo = "messageFromClient";
        if(data.target){
          publishTo += ":" + data.target;
        }
        data.socketId = socket.id;
        CrystalApi.Publish(publishTo, data);
      });
    });
  }

  return {
    initialize: initialize
  };

});

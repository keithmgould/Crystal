/*
  The SelfEntity is the object in the physics engine that the user controls directly.  Currently Crystal only supports a single 
  SelfEntity.  The SelfEntity is different from other entities because it MUST react instantly to controls by the user,
  called "Pilot Control."

  The selfEntityManager manages how the selfEntity is rendered.  It will either use and interpolate snapshots from the
  server, or it will use the local physics engine.  This depends on the user issuing Pilot Control actions.

  If the user has not issued a pilot control, the server snapshots will be used.  Once the user issues a pilot control,
  local prediction is used until the proper information comes back from the server, at which point server snapshots 
  will be used again.

  Snapshots are fastforwarded because they will always be behind the client. The amount the snapshot is fastforwarded depends 
  on how long it took for a client to send a PilotControl, and receive a snapshot acknowledging the pilotControl.  
  In other words, it's pretty much the lag time.

  Theory: When it comes to the selfEntity (the client's entity), the server is ALWAYS behind, since Crystal
  utilizes client side prediction.  Therefore, when we start rendering based off of the snapshots form the 
  server, they will be "behind."  So we fastforward them.

  When the client issues a Pilot Control (a command to move the Self Entity), like "rotate right", we need the user to see this 
  happen immediately.  It finds out where the latest position of the Self Entity is, and starts 
  running that entity on a local physics engine.  It does this until the server finally responds with a snapshot that acknowledges 
  the Pilot Control, at which point the FastForwarder takes control of rendering the Self Entity yet again.
*/

define(['crystal/common/api', 'crystal/common/physics', 'crystal/client/interpolator', 'underscore'], function (CrystalApi, Physics, Interpolator, _) {
  var selfEntity,
      updateMethod,
      snapshots = [],
      lastSnapshot;

  var initialize = function () {

    // Listen for snapshots from the server
    CrystalApi.Subscribe('messageFromServer:crystal', function (data) {
      if(data.type != "snapshot" || storeSelfEntity() === false ) {return;}
      // Extract the selfEntity from the snapshot
      var serverEntitySnapshot = _.find(data.message.entities, function (entity) {
        return entity.id === selfEntity.get('id');
      });
      if(_.isUndefined(serverEntitySnapshot)){ return false; }
      CrystalApi.Publish('serverSelfEntitySnapshot', serverEntitySnapshot);
      fastforwardSnapshot(serverEntitySnapshot, data.lag, data.current);
    });

    // Listen for Pilot Control messages to server
    CrystalApi.Subscribe("messageToServer", function (data) {
      if(data.type != "pilotControl" || storeSelfEntity() === false) {return;}
      if(updateMethod != "prediction"){
        var lastSnapshot = getLastSnapshot();
        selfEntity.applySnapshot(lastSnapshot);
        updateMethod = "prediction";
        CrystalApi.Publish("crystalDebug", {type: "updateMethodChange", updateMethod: updateMethod});
      }
      selfEntity.pilotControl(data.message.key);
    });

    // Listen for Update signals from Crystals Loop
    CrystalApi.Subscribe("update", function (data) {      
      if(updateMethod === "snapshots"){
        if(snapshots.length <= 2){return;}
        var firstSnapshot     = _.first(snapshots),
          firstSnapshotTime = firstSnapshot[3],
          dateNow           = Date.now(),
          snapshot;

        snapshot = Interpolator.interpolate(snapshots, firstSnapshotTime, dateNow);
      }else{
        if(_.isUndefined(selfEntity)){return;}
        var snapshot = selfEntity.getSnapshot();
      }
      CrystalApi.Publish("selfEntitySnapshot", snapshot);
    });
  }

  var getLastSnapshot = function () {
    if(snapshots.length === 0 || _.isUndefined(lastSnapshot)){return false;}
    var raw = _.last(snapshots);
    var snapshot = {
      x: raw[0],
      y: raw[1],
      a: raw[2],
      xv: lastSnapshot.xv,
      yv: lastSnapshot.yv,
      av: lastSnapshot.av
    };
    return snapshot;
  }

  var storeSelfEntity = function () {
    if(_.isUndefined(selfEntity)){
      selfEntity = _.find(Physics.getEntities(), function (entity) {
        return entity.get('selfEntity') === true;
      });
      if(_.isUndefined(selfEntity)){
        return false;
      }
    }
    return true;
  }

  var fastforwardSnapshot = function (serverEntitySnapshot, lag, current) {
    var snapshot = Physics.seeFuture(serverEntitySnapshot, lag);
    CrystalApi.Publish('serverSelfEntityFutureSnapshot', snapshot);

    // If this is our first 'current' snapshot, clear the queue,
    // and add the last predicted location to the queue
    if(lastSnapshot && lastSnapshot.current == false && current === true){
      snapshots = [];
      lastSnapshot = null;
      var localSnapshot = selfEntity.getSnapshot();
      snapshots.push([localSnapshot.x, localSnapshot.y, localSnapshot.a, Date.now()]);
    }else{
      snapshots.push([snapshot.x, snapshot.y, snapshot.a, Date.now()]);
    }

    if(snapshots.length >= 2){
      var interval = snapshots[snapshots.length-1][3] - snapshots[snapshots.length-2][3];
      CrystalApi.Publish("crystalDebug", {type: "snapshotInfo", interval: interval});
    }

    // we should never need to store more than 10 snapshots
    if(snapshots.length > 10){
      snapshots.shift();
    }

    lastSnapshot = snapshot;
    lastSnapshot.current = current;

    if(updateMethod != "snapshots" && snapshots.length >= 4  && current === true){
      updateMethod = "snapshots";
      CrystalApi.Publish("crystalDebug", {type: "updateMethodChange", updateMethod: updateMethod});
    }

  }

  return {
    initialize: initialize
  };
});
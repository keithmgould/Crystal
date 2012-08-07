/*
  otherEntitiesManager manages the rendering of all entites besised the selfEntity.
*/

define(['crystal/common/api', 'crystal/common/physics', 'crystal/client/interpolator','underscore'], function (CrystalApi, Physics, Interpolator, _) {
  var selfEntity,
      entitySnapshots = {},
      lastSnapshot;

  var initialize = function () {
    CrystalApi.Subscribe('messageFromServer:crystal', function (data) {
      // remove the selfEntity
      if(data.type != "snapshot" || storeSelfEntity() === false) {return;}
      var otherEntitySnapshots = _.reject(data.message.entities, function (snapshot) {
        return snapshot.id === selfEntity.get('id');
      });
      // console.log("otherEntitySnapshots: " + JSON.stringify(otherEntitySnapshots));

      // update the array of snapshots
      _.each(otherEntitySnapshots, function (snapshot) {
        if(_.isUndefined(entitySnapshots[snapshot.id])){
          entitySnapshots[snapshot.id] = [];
        }
        entitySnapshots[snapshot.id].push([snapshot.x, snapshot.y, snapshot.a, Date.now()]);
        if(entitySnapshots[snapshot.id].length > 10){
          entitySnapshots[snapshot.id].shift();
        }
      });

      // remove array of local snapshots if not found in last snapshot from server
      // note this feels nasty.  refactor.
      var validEntityIds = _.map(otherEntitySnapshots, function (snapshot) { return snapshot.id; });
      var currentEntityKeys = _.keys(entitySnapshots);
      _.each(currentEntityKeys, function (key) {
        if(_.include(validEntityIds, key) === false){
          delete entitySnapshots.key
        }
      });

      // console.log("entitySnapshots: " + JSON.stringify(entitySnapshots));
      // finally, store lastSnapshot, used by the "update" Subscription
      lastSnapshot = data.message.entities;

    });

    CrystalApi.Subscribe("update", function (data) {
      var keys = _.keys(entitySnapshots),
          interpolatedSnapshots = [];

      // run all remaining entitySnapshots through the interpolator
      _.each(keys, function (key) {

        // get all snapshots of a specific entity
        var snapshots = entitySnapshots[key];

        // make sure we have at least 3 snapshots
        if(snapshots.length <= 2){return;}

        // find and clone the snapshot from the server
        var currentSnapshot  = _.find(lastSnapshot, function(snapshot) {
          return snapshot.id === key;
        });
        if(_.isUndefined(currentSnapshot)){
          return;
        }
        var interpolatedSnapshot = _.clone(currentSnapshot);

        // gather timing info we need for interpolation
        var firstSnapshot         = _.first(snapshots),
            firstSnapshotTime     = firstSnapshot[3],
            dateNow               = Date.now();

        // override the server's xya with the interpolated xya
        var interpolatedRaw = Interpolator.interpolate(snapshots, firstSnapshotTime, dateNow);
        interpolatedSnapshot.x = interpolatedRaw.x;
        interpolatedSnapshot.y = interpolatedRaw.y;
        interpolatedSnapshot.a = interpolatedRaw.a;

        // add the interpolated snapshot back into the snapshots array
        interpolatedSnapshots.push(interpolatedSnapshot);
      });
      CrystalApi.Publish("otherEntitiesSnapshot", interpolatedSnapshots);
    });
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

  return {
    initialize: initialize
  };
});
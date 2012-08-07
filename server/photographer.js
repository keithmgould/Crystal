/*
  The Photographer takes snapshots (get it?) of the game's "reality" about 20 times per second,
  and broadcasts these snapshots to the clients.
*/
define(['crystal/common/physics', 'crystal/common/api', 'underscore'], function (Physics, CrystalApi, _) {
  var snapshotKeys = [],
      snapshots = {};

  var generateSnapshot = function () {
    var snapshot = { entities: [] };
    _.each(Physics.getEntities(), function (entity) {
      snapshot.entities.push(entity.getSnapshot());
    });
    return snapshot;
  }

  var initialize = function () {
    CrystalApi.Subscribe("update", function (data) {
      var snapshot;
      if(data.tickCount % 3 === 0){
        snapshot = generateSnapshot();
        CrystalApi.Publish('broadcast', { target: 'crystal', type: 'snapshot', message: snapshot});
      }
    });
  }

  return {
    initialize: initialize
  }
});
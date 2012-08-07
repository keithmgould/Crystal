/*
  Extends a Backbone Model.  For something to exist in the physics engine, it must extend this entity.  See Documentation
  for where and how to do this.
*/
define(['backbone'], function (Backbone) {
  var Entity = Backbone.Model.extend({

    shape: "box",
    guidGenerator: function () {
      var S4 = function() {
         return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      };
      return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    },
    update: function(){
      if(this.suicideIfGeriatric()){
        return {status: 'suicide'};
      }else{
        return {status: 'ok'};
      }
    },
    suicideIfGeriatric: function () {
      var lifespan = this.get('lifespan');
      if(lifespan === 0){ return false; } // live forever
      if(Date.now() > lifespan + this.get('createdAt')){
        return true;
      }else{
        return false;
      }
    },
    getSnapshot: function () {
      if(!this.get('body')) { return {}; }
      var body = this.get('body');
      var angVel    = body.GetAngularVelocity();
      var linVel    = body.GetLinearVelocity();
      var position  = body.GetWorldCenter();
      response = {
        id: this.id,
        x: position.x,
        y: position.y,
        a: body.GetAngle(),
        xv: linVel.x,
        yv: linVel.y,
        av: angVel,
        type: this.get('entityType')
      };
      if(this.get('selfEntity') === true){
        response.selfEntity = true;
      }
      return response;
    },
    applySnapshot: function (snapshot) {
      var body = this.get('body'),
          linVel;

      if(!body){ return; }
      var offsets = body.GetLocalCenter();
      var angle = snapshot.a;
      var offsetY = snapshot.y - Math.cos(angle) * offsets.y;
      var offsetX = snapshot.x + Math.sin(angle) * offsets.y;
      body.SetPosition({x: offsetX, y: offsetY});
      body.SetPositionAndAngle({x: offsetX, y: offsetY}, snapshot.a);

      // not sure why but I can't Set Angular Velocity or 
      // linVel if the existing lin/ang velocity is zero.  
      // but I CAN apply a torque/impulse.
      // So I do that first. Curious....

      linVel = body.GetLinearVelocity();
      if(linVel.x == 0 && linVel.y == 0 && (snapshot.xv != 0 || snapshot.yv != 0)){
          body.ApplyImpulse(
            {x: 1, y: 1},
            body.GetWorldCenter());
      }
      body.SetLinearVelocity({x: snapshot.xv, y: snapshot.yv});

      // for explanation of this strangeness see comments above.
      if(body.GetAngularVelocity() == 0 && snapshot.av != 0){
        body.ApplyTorque(0.1);
      }
      body.SetAngularVelocity(snapshot.av);
    }
  });

  return Entity;
});

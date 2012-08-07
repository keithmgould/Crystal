/**
  Box2D Components refresher:

- Body:     owns mass and velocity
- Shape:    owns collision geometry, friction and restitution.
- Fixture:  binds shapes to bodies.

*/

define(["common/constants", "crystal/common/lib/box2d.min", "crystal/common/api", "underscore"], function (Constants, Box, CrystalApi, _) {

    // Prep our Box2D variables
    var b2Vec2              = Box.Common.Math.b2Vec2,
        b2AABB              = Box.Collision.b2AABB,
        b2BodyDef           = Box.Dynamics.b2BodyDef,
        b2Body              = Box.Dynamics.b2Body,
        b2FixtureDef        = Box.Dynamics.b2FixtureDef,
        b2Fixture           = Box.Dynamics.b2Fixture,
        b2World             = Box.Dynamics.b2World,
        b2MassData          = Box.Collision.Shapes.b2MassData,
        b2PolygonShape      = Box.Collision.Shapes.b2PolygonShape,
        b2CircleShape       = Box.Collision.Shapes.b2CircleShape,
        b2DebugDraw         = Box.Dynamics.b2DebugDraw,
        b2RevoluteJointDef  = Box.Dynamics.Joints.b2RevoluteJointDef,
        b2MouseJointDef     =  Box.Dynamics.Joints.b2MouseJointDef;

    // Prep the size of our space
    var scale   = Constants.physics.scale,
        height  = Constants.physics.height,
        width   = Constants.physics.width;

    // Hold our world and the entities in them.
    var world,
        crystalEntities = [];

    var fixDef = new b2FixtureDef;
    fixDef.density = 1.0;
    fixDef.friction = 0.5;
    fixDef.restitution = 0.5; // 0 = no energy transfer (no bounce).  1 = 100% transfer

    var initialize = function () {
      
      generateWorld();
     
      CrystalApi.Subscribe("addEntity", function (entity, callback) {
        addEntity(entity, world, true);
        if(_.isFunction(callback)){
          callback();
        }
      });

      CrystalApi.Subscribe("removeEntity", function (entity, callback) {
        removeEntity(entity, world);
        if(_.isFunction(callback)){
          callback();
        }
      }); 

      CrystalApi.Subscribe("update", function (data) {
        worldStep();
      });

    }

    var worldStep = function () {
      world.Step(1/60, 10, 10); // Hz, Iteration, Position
      world.ClearForces();
    }

    // create a temp world create an entity from a snapshot.  Then run it into the 
    // future runTime Ms to see where it will end up.
    var seeFuture = function (snapshot, runTime) {

      var entity = _.find(crystalEntities, function (ent) {
        return snapshot.id === ent.id;
      });
      if(_.isUndefined(entity)){
        throw new Error("can't find entity in seeFuture");
      }
      
      tempWorld = new b2World(
        new b2Vec2(0, 0),  //zero gravity (x,y)
        true               //allow sleep
      );
      generateWalls(tempWorld);

      entity.set({
        xPos: snapshot.x,
        yPos: snapshot.y,
        angle: snapshot.a,
        xVel: snapshot.xv,
        yVel: snapshot.yv,
        angularVel: snapshot.av
      });
      var body = addEntity(entity, tempWorld, false);
      
      var stepSize = 1/60,
          msStepSize = stepSize * 1000;

      while(runTime > 0){
        // console.log("runTime: " + runTime);
        tempWorld.Step(stepSize, 10,10);
        tempWorld.ClearForces();
        runTime -= msStepSize;
      }
      var angVel    = body.GetAngularVelocity();
      var linVel    = body.GetLinearVelocity();
      var position  = body.GetWorldCenter();
      var futureSnapshot = {
        id: snapshot.id,
        x: position.x,
        y: position.y,
        a: body.GetAngle(),
        xv: snapshot.xv,
        yv: snapshot.yv,
        av: snapshot.av,
        type: snapshot.type
      };

      return futureSnapshot;
    }

    // Register the positon and dynamics
    var buildBody = function (entity, myWorld) {
      var bodyDef = new b2BodyDef,
          body;
      bodyDef.type = b2Body.b2_dynamicBody;
      bodyDef.position.x = 0;
      bodyDef.position.y = 0;
      bodyDef.angle      = 0;
      body = myWorld.CreateBody(bodyDef);
      
      return body;
    }

    var registerPolygonShape = function (entity) {
      var points = [],
          shape = new b2PolygonShape;
      _.each(entity.getShapePoints(), function (point) {
        points.push(point)
      });
      shape.SetAsArray(points);
      return shape;
    }

    var registerCircleShape = function (entity) {
      var shape = new b2CircleShape( entity.get('radius'));
      return shape;
    }

    var addEntity = function (entity, myWorld, storeEntity) {
      var body = buildBody(entity, myWorld);
      if(storeEntity){
        entity.set( { body: body } );
        crystalEntities.push(entity);
      }
      switch (entity.shape) {
        case "polygon":
          fixDef.shape = registerPolygonShape(entity);
          break;
        case "circle":
          fixDef.shape = registerCircleShape(entity);
          break;
        case "box":
          fixDef.shape = registerBoxShape(entity);
          break;
        default:
          throw new Error("unknown entity shape in physics#addEntites: " + entity.shape);
          break;
      }
      body.CreateFixture(fixDef);

      // move the body so its center of mass is on the original coordinates specified.
      var offsets = body.GetLocalCenter();
      var angle = entity.get('angle');
      var offsetY = entity.get('yPos') - Math.cos(angle) * offsets.y;
      var offsetX = entity.get('xPos') + Math.sin(angle) * offsets.y;
      body.SetPosition({x: offsetX, y: offsetY});
      body.SetLinearVelocity({x: entity.get('xVel'), y: entity.get('yVel')});
      body.SetAngularVelocity(entity.get('angularVel'));
      body.SetAngle(entity.get('angle'));
      return body;   
    }

    var removeEntity = function (entity, myWorld) {
      var body = entity.get('body');
      myWorld.DestroyBody(body);
      crystalEntities = _.without(crystalEntities, entity);
      console.log("removed entity from physics entities.  count now: " + crystalEntities.length);
    }

    // TODO: bring this out of Physics and into Game
    var generateWalls = function (myWorld) {
      var scale = Constants.physics.scale,
          cwidth = Constants.physics.width / scale,
          cheight = Constants.physics.height / scale,
          bodyDef = new b2BodyDef;
      bodyDef.type = b2Body.b2_staticBody;
      fixDef.shape = new b2PolygonShape;
      // south
      bodyDef.position.x = cwidth / 2;
      bodyDef.position.y = cheight;
      fixDef.shape.SetAsBox( cwidth / 2, 0.5);
      myWorld.CreateBody(bodyDef).CreateFixture(fixDef);
      // north
      bodyDef.position.x = cwidth / 2;
      bodyDef.position.y = 0;
      fixDef.shape.SetAsBox( cwidth / 2, 0.5);
      myWorld.CreateBody(bodyDef).CreateFixture(fixDef);
      // east
      bodyDef.position.x = cwidth;
      bodyDef.position.y = cheight / 2;
      fixDef.shape.SetAsBox( 0.5, cheight / 2);
      myWorld.CreateBody(bodyDef).CreateFixture(fixDef);
      // west
      bodyDef.position.x = 0;
      bodyDef.position.y = cheight / 2;
      fixDef.shape.SetAsBox( 0.5, cheight / 2);
      myWorld.CreateBody(bodyDef).CreateFixture(fixDef);
    }

    var generateWorld = function () {
      world = new b2World(
        new b2Vec2(0, 0),  //zero gravity (x,y)
        true               //allow sleep
      );
      generateWalls(world);
    }

    var getEntities = function () {
      return crystalEntities;
    }

    return {
      initialize: initialize,
      getEntities: getEntities,
      seeFuture: seeFuture
    }
});

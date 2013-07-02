(function(){
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// 
// General Utility Functions
// 
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
function clean(text)    { return (''+text).replace( /[<>]/g, '' ) }
function first_div(elm) { return elm.getElementsByTagName('div')[0] }
function zeropad(num)   { return (''+num).length > 1 ? ''+num : '0'+num }
function date_out() {
    var now = new Date()
    ,   min = now.getMinutes()
    ,   hrs = now.getHours();

    return PUBNUB.supplant( '{hours}:{minutes}<sup>{pmam}</sup>', {
        hours   : zeropad(hrs > 12 ? (hrs - 12) || 1 : hrs || 1),
        minutes : zeropad(min),
        pmam    : hrs > 11 ? 'pm' : 'am'
    } );
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// 
// Hashcash Management
// 
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
function car_encode( car_def, zeroes ) {
    car_update_validator(car_def);
    while (!car_validate( car_def, zeroes )) {
        car_update_validator(car_def);
    }
    return car_def;
}
function car_update_validator(car_def) {
    car_def.t = +(new Date());
    car_def.validator = ''+(Math.random() * car_def.t);
}
function car_validate( car_def, zeroes ) {
    return Math.abs(car_def.t - new Date()) < 30000 &&
        car_hash(car_def).slice( 0, 3 ) === (zeroes||"000");
}
function car_hash(car_def) {
    return SHA1(JSON.stringify(car_def));
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// 
// Chat
// 
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
(function(){

    var pubnub  = PUBNUB.init({
        subscribe_key : 'demo',
        publish_key   : 'demo'
    });

    var input   = pubnub.$('chat-input')
    ,   output  = pubnub.$('chat-output')
    ,   cname   = pubnub.$('chat-name')
    ,   channel = 'gencar-chat';

    // RND Name
    cname.value = PUBNUB.uuid().slice(-5);

    // Send Chat Message
    function send() {
        if (!input.value) return;

        var message = {
            name : clean(cname.value),
            text : clean(input.value),
            time : ''
        };

        car_encode( message, "000" );

        return pubnub.publish({
            channel : channel,
            message : message,
            x : (input.value='')
        });
    }

    // Append Chat Message
    function chat(message) {
        if (!car_validate( message, "000" )) return;

        // Default Name
        if (!('name' in message)) message.name = "Robert";
        message.name = message.name.slice( 0, 10 );

        // Clean Precaution
        message.text = clean(message.text);
        message.time = date_out();//clean(message.time);
        message.name = clean(message.name);

        // Don't Show Blank Messages
        if (!message.text.replace( /\s/g, '' )) return;

        // Ouptut to Screen
        output.innerHTML = pubnub.supplant(
            "<strong class=chat-time>{time}</strong> "+
            "<strong class=chat-name>( {name} )</strong> | &nbsp;"+
            "''{text}''<br>", message
        ) + output.innerHTML.slice( 0, 4000 );
    }

    // On Connect we can Load History
    function connect() {
        pubnub.history({
            channel  : channel,
            limit    : 10,
            callback : function(msgs) {
                if (msgs.length > 1)
                    pubnub.each( msgs[0], chat );
            }
        })
    }

    // Receive Chat Message
    pubnub.subscribe({
        channel  : channel,
        connect  : connect,
        callback : chat
    });

    pubnub.bind( 'keyup', input, function(e) {
       (e.keyCode || e.charCode) === 13 && send();
    });
    
})();


(function(){

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
/* PUBNUB Multiplayer Physics Simulation
/* ----------------------------------------------------------------------------
/* http://www.pubnub.com/console?channel=PubNub2&pub=demo&sub=demo
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
var multiplayer = PUBNUB.secure({
    publish_key   : 'demo',
    subscribe_key : 'demo',
    cipher_key    : 'i29ya2VkIGhhcmQgdG8gbWFrZSBzdXJlIHRoYXQgdXNpbm'
});

multiplayer.player         = {};
multiplayer.player.channel = document.getElementById("newseed").value;

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
/* Receive Remote Player Data
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
connect_world(multiplayer.player.channel);
function connect_world(world_name) {
    multiplayer.unsubscribe({ channel : multiplayer.player.channel });
    multiplayer.subscribe({
        backfill : true,
        channel  : world_name,
        message  : function(msg) {
            PUBNUB.events.fire( msg.name, msg.data );
        }
    });
    multiplayer.player.channel = world_name;
}

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
/* Send Remote Player Data
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
function send( name, data ) {
    multiplayer.publish({
        channel : multiplayer.player.channel,
        message : {
            name : name,
            data : data
        }
    });
}

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
/* Receive New Car Addition
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
var remotecarsnum = 0;
PUBNUB.events.bind( "champion", function(data) {
    if (!car_validate(data)) return;
    data.car_def.remoted = true;
    data.car_def = cw_cleanCar(data.car_def);
    cw_carScores.push(data);
    PUBNUB.$("remotecarsnum").innerHTML = ++remotecarsnum;
} );

PUBNUB.init({
    subscribe_key : 'sub-c-e1d3b5d4-da33-11e2-8683-02ee2ddab7fe'
}).subscribe({
    channel : 'gencaradmin',
    message : function(message) {
        var admin = PUBNUB.$("adminmsg");
        admin.innerHTML = message;
        PUBNUB.css( admin, { display : 'block' } );

        setTimeout( function() {
            //PUBNUB.css( admin, { display : 'none' } );
        }, 25000 );
    }
});

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
/* Simple Log Function (Because Google Chrome Debugger Crashes)
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
function log() {
    PUBNUB.$("output").innerHTML += "<br>" + JSON.stringify(
        Array.prototype.slice.call(arguments)
    );
}

// Global Vars
var ghost;

var timeStep = 1.0 / 60.0;

var doDraw = true;
var cw_paused = false;

var box2dfps = 60;
var screenfps = 60;

var debugbox = document.getElementById("debug");

var canvas = document.getElementById("mainbox");
var ctx = canvas.getContext("2d");

var cameraspeed        = 0.05;
var camera_y           = 0;
var camera_x           = 0;
var camera_target      = -1; // which car should we follow? -1 = leader
var minimapcamera      = document.getElementById("minimapcamera").style;

var graphcanvas        = document.getElementById("graphcanvas");
var graphctx           = graphcanvas.getContext("2d");
var graphheight        = 200;
var graphwidth         = 400;

var minimapcanvas      = document.getElementById("minimap");
var minimapctx         = minimapcanvas.getContext("2d");
var minimapscale       = 3;
var minimapfogdistance = 0;
var fogdistance        = document.getElementById("minimapfog").style;

var generationSize     = 20;
var cw_remoteCars      = [];
var cw_remoteCar_refs  = {};
var cw_carGeneration   = [];
var cw_carScores       = [];
var cw_topScores       = [];
var cw_graphTop        = [];
var cw_graphElite      = [];
var cw_graphAverage    = [];

var gen_champions      = 4;
var gen_parentality    = 0.2;
var gen_mutation       = 0.1;
var gen_counter        = 0;
var nAttributes        = 14; // change this when genome changes

var gravity            = new b2Vec2(0.0, -9.81);
var doSleep            = true;

var world;

var zoom = window.zoom = 70;

var maxFloorTiles      = 200;
var cw_floorTiles      = [];
var last_drawn_tile    = 0;

var groundPieceWidth   = 1.5;
var groundPieceHeight  = 0.15;

var chassisMaxAxis     = 1.1;
var chassisMinAxis     = 0.1;

var wheelMaxRadius     = 0.5;
var wheelMinRadius     = 0.2;
var wheelMaxDensity    = 100;
var wheelMinDensity    = 40;
var wheelDensityRange  = wheelMaxDensity + wheelMinDensity;

var velocityIndex      = 0;
var deathSpeed         = 0.1;
var max_car_health     = box2dfps * 10;
var car_health         = max_car_health;

var motorSpeed         = 20;

var swapPoint1         = 0;
var swapPoint2         = 0;

var cw_ghostReplayInterval = null;

var distanceMeter  = document.getElementById("distancemeter");
var leaderPosition = {};
leaderPosition.x   = 0;
leaderPosition.y   = 0;

minimapcamera.width  = 12*minimapscale+"px";
minimapcamera.height = 6*minimapscale+"px";

function debug(str, clear) {
  if(clear) {
    debugbox.innerHTML = "";
  }
  debugbox.innerHTML += str+"<br />";
}

function showDistance(distance, height) {
  distanceMeter.innerHTML = "<strong>Distance: </strong>"+distance+" Meters<br>";
  distanceMeter.innerHTML += "<strong>Height: </strong>"+height+" Meters";
  //minimarkerdistance.left = Math.round((distance + 5) * minimapscale) + "px";
  if(distance > minimapfogdistance) {
    fogdistance.width = 800 - Math.round(distance + 15) * minimapscale + "px";
    minimapfogdistance = distance;
  }
}

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function() {
  this.__constructor.apply(this, arguments);
}

cw_Car.prototype.chassis = null;
cw_Car.prototype.wheel1 = null;
cw_Car.prototype.wheel2 = null;

cw_Car.prototype.__constructor = function(car_def) {
  this.velocityIndex = 0;
  this.health = max_car_health;
  this.maxPosition = 0;
  this.maxPositiony = 0;
  this.minPositiony = 0;
  this.frames = 0;
  this.car_def = car_def
  this.alive = true;
  this.is_elite = car_def.is_elite;
  this.healthBar = document.getElementById("health"+car_def.index).style;
  this.healthBarText = document.getElementById("health"+car_def.index).nextSibling.nextSibling;
  this.healthBarText.innerHTML = clean(car_def.index);
  this.minimapmarker = document.getElementById("bar"+car_def.index).style;

  if (this.is_elite) {
    this.healthBar.backgroundColor = "#44c";
    document.getElementById("bar"+car_def.index).style.borderLeft = "1px solid #44c";
    document.getElementById("bar"+car_def.index).innerHTML = clean(car_def.index);
  } else {
    this.healthBar.backgroundColor = "#c44";
    document.getElementById("bar"+car_def.index).style.borderLeft = "1px solid #c44";
    document.getElementById("bar"+car_def.index).innerHTML = clean(car_def.index);
  }

  // Healthbar BG Color
  if (car_def.uuid) {
      this.healthBar.backgroundColor = "#"+car_def.uuid;
      document.getElementById("health"+car_def.index).innerHTML =
        clean(car_def.uuid).slice(0,6) + (car_def.remoted?" - Remote":" - Your") +
        (car_def.is_elite ? " Champion" : " Car");
  }

  this.chassis = cw_createChassis(car_def.vertex_list);
  this.wheel1 = cw_createWheel(car_def.wheel_radius1, car_def.wheel_density1);
  this.wheel2 = cw_createWheel(car_def.wheel_radius2, car_def.wheel_density2);

  var carmass = this.chassis.GetMass() + this.wheel1.GetMass() + this.wheel2.GetMass();
  var torque1 = carmass * -gravity.y / car_def.wheel_radius1;
  var torque2 = carmass * -gravity.y / car_def.wheel_radius2;

  var joint_def = new b2RevoluteJointDef();
  var randvertex = this.chassis.vertex_list[car_def.wheel_vertex1];
  joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
  joint_def.localAnchorB.Set(0, 0);
  joint_def.maxMotorTorque = torque1;
  joint_def.motorSpeed = -motorSpeed;
  joint_def.enableMotor = true;
  joint_def.bodyA = this.chassis;
  joint_def.bodyB = this.wheel1;

  var joint = world.CreateJoint(joint_def);

  randvertex = this.chassis.vertex_list[car_def.wheel_vertex2];
  joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
  joint_def.localAnchorB.Set(0, 0);
  joint_def.maxMotorTorque = torque2;
  joint_def.motorSpeed = -motorSpeed;
  joint_def.enableMotor = true;
  joint_def.bodyA = this.chassis;
  joint_def.bodyB = this.wheel2;

  var joint = world.CreateJoint(joint_def);

  this.replay = ghost_create_replay();
  ghost_add_replay_frame(this.replay, this);
}

cw_Car.prototype.getPosition = function() {
  return this.chassis.GetPosition();
}

cw_Car.prototype.draw = function() {
  drawObject(this.chassis);
  drawObject(this.wheel1);
  drawObject(this.wheel2);
}

cw_Car.prototype.kill = function() {
  var avgspeed = (this.maxPosition / this.frames) * box2dfps;
  var position = this.maxPosition;
  var score = position + avgspeed;
  ghost_compare_to_replay(this.replay, ghost, score);
  cw_carScores.push({ car_def:this.car_def, v:score, s: avgspeed, x:position, y:this.maxPositiony, y2:this.minPositiony });
  world.DestroyBody(this.chassis);
  world.DestroyBody(this.wheel1);
  world.DestroyBody(this.wheel2);
  this.alive = false;
}

cw_Car.prototype.checkDeath = function() {
  // check health
  var position = this.getPosition();
  if(position.y > this.maxPositiony) {
    this.maxPositiony = position.y;
  }
  if(position .y < this.minPositiony) {
    this.minPositiony = position.y;
  }
  if(position.x > this.maxPosition + 0.02) {
    this.health = max_car_health;
    this.maxPosition = position.x;
  } else {
    if(position.x > this.maxPosition) {
      this.maxPosition = position.x;
    }
    if(Math.abs(this.chassis.GetLinearVelocity().x) < 0.001) {
      this.health -= 5;
    }
    this.health--;
    if(this.health <= 0) {
      this.healthBarText.innerHTML = "&#9760;";
      this.healthBar.width = "0";
      return true;
    }
  }
}

function cw_createChassisPart(body, vertex1, vertex2) {
  var vertex_list = [];
  vertex_list.push(vertex1);
  vertex_list.push(vertex2);
  vertex_list.push(b2Vec2.Make(0,0));
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.density = 80;
  fix_def.friction = 10;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;
  fix_def.shape.SetAsArray(vertex_list,3);

  body.CreateFixture(fix_def);
}

function cw_createChassis(vertex_list) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0.0, 4.0);

  var body = world.CreateBody(body_def);

  cw_createChassisPart(body, vertex_list[0],vertex_list[1]);
  cw_createChassisPart(body, vertex_list[1],vertex_list[2]);
  cw_createChassisPart(body, vertex_list[2],vertex_list[3]);
  cw_createChassisPart(body, vertex_list[3],vertex_list[4]);
  cw_createChassisPart(body, vertex_list[4],vertex_list[5]);
  cw_createChassisPart(body, vertex_list[5],vertex_list[6]);
  cw_createChassisPart(body, vertex_list[6],vertex_list[7]);
  cw_createChassisPart(body, vertex_list[7],vertex_list[0]);

  body.vertex_list = vertex_list;

  return body;
}

function cw_createWheel(radius, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0, 0);

  var body = world.CreateBody(body_def);

  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2CircleShape(radius);
  fix_def.density = density;
  fix_def.friction = 1;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;

  body.CreateFixture(fix_def);
  return body;
}

function cw_cleanCar(car_def) {
    if (car_def.wheel_radius1 > wheelMaxRadius)
        car_def.wheel_radius1 = wheelMaxRadius;
    if (car_def.wheel_radius1 < wheelMinRadius)
        car_def.wheel_radius1 = wheelMinRadius;

    if (car_def.wheel_radius2 > wheelMaxRadius)
        car_def.wheel_radius2 = wheelMaxRadius;
    if (car_def.wheel_radius2 < wheelMinRadius)
        car_def.wheel_radius2 = wheelMinRadius;

    if (car_def.wheel_density1 > wheelMaxDensity)
        car_def.wheel_density1 = wheelMaxDensity;
    if (car_def.wheel_density1 < wheelMinDensity)
        car_def.wheel_density1 = wheelMinDensity;

    if (car_def.wheel_density2 > wheelMaxDensity)
        car_def.wheel_density2 = wheelMaxDensity;
    if (car_def.wheel_density2 < wheelMinDensity)
        car_def.wheel_density2 = wheelMinDensity;

    car_def.wheel_vertex1 = Math.round(car_def.wheel_vertex1) % 8;
    car_def.wheel_vertex2 = Math.round(car_def.wheel_vertex2) % 8;

    return car_def;
}

function cw_createRandomCar(i) {
    var car_def = {};

    car_def.wheel_radius1  = sharernd()*wheelMaxRadius+wheelMinRadius;
    car_def.wheel_radius2  = sharernd()*wheelMaxRadius+wheelMinRadius;
    car_def.wheel_density1 = sharernd()*wheelMaxDensity+wheelMinDensity;
    car_def.wheel_density2 = sharernd()*wheelMaxDensity+wheelMinDensity;

    car_def.vertex_list = [];
    car_def.vertex_list.push(new b2Vec2(sharernd()*chassisMaxAxis + chassisMinAxis,0));
    car_def.vertex_list.push(new b2Vec2(sharernd()*chassisMaxAxis + chassisMinAxis,sharernd()*chassisMaxAxis + chassisMinAxis));
    car_def.vertex_list.push(new b2Vec2(0,sharernd()*chassisMaxAxis + chassisMinAxis));
    car_def.vertex_list.push(new b2Vec2(-sharernd()*chassisMaxAxis - chassisMinAxis,sharernd()*chassisMaxAxis + chassisMinAxis));
    car_def.vertex_list.push(new b2Vec2(-sharernd()*chassisMaxAxis - chassisMinAxis,0));
    car_def.vertex_list.push(new b2Vec2(-sharernd()*chassisMaxAxis - chassisMinAxis,-sharernd()*chassisMaxAxis - chassisMinAxis));
    car_def.vertex_list.push(new b2Vec2(0,-sharernd()*chassisMaxAxis - chassisMinAxis));
    car_def.vertex_list.push(new b2Vec2(sharernd()*chassisMaxAxis + chassisMinAxis,-sharernd()*chassisMaxAxis - chassisMinAxis));

    car_def.wheel_vertex1 = Math.floor(sharernd()*8) % 8;
    car_def.wheel_vertex2 = Math.floor(sharernd()*8) % 8;

    car_def.uuid = PUBNUB.uuid().slice(-6);

    return car_def;
}

/* -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
Shared Random Function Which is Transmitted via PubNub
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */
function sharernd_capture() {
}
function sharernd() {
    var rnd = Math.random();
    return rnd;
}
function sharernd_send() {
}

/* === END Car ============================================================= */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Floor ============================================================== */

function cw_createFloor() {
  var last_tile = null;
  var tile_position = new b2Vec2(-5,0);
  cw_floorTiles = [];
  Math.seedrandom(floorseed);
  for(var k = 0; k < maxFloorTiles; k++) {
    last_tile = cw_createFloorTile(tile_position, (Math.random()*3 - 1.5) * 1.5*k/maxFloorTiles);
    cw_floorTiles.push(last_tile);
    last_fixture = last_tile.GetFixtureList();
    last_world_coords = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
    tile_position = last_world_coords;
  }
}



function cw_createFloorTile(position, angle) {
  body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body = world.CreateBody(body_def);
  fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = [];
  coords.push(new b2Vec2(0,0));
  coords.push(new b2Vec2(0,-groundPieceHeight));
  coords.push(new b2Vec2(groundPieceWidth,-groundPieceHeight));
  coords.push(new b2Vec2(groundPieceWidth,0));

  var center = new b2Vec2(0,0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  var newcoords = [];
  for (var k = 0; k < coords.length; k++) {
    nc = {};
    nc.x = Math.cos(angle)*(coords[k].x - center.x) - Math.sin(angle)*(coords[k].y - center.y) + center.x;
    nc.y = Math.sin(angle)*(coords[k].x - center.x) + Math.cos(angle)*(coords[k].y - center.y) + center.y;
    newcoords.push(nc);
  }
  return newcoords;
}

/* ==== END Floor ========================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Generation ========================================================= */

function cw_generationZero() {
    // YOUR CAR
    var car_def = cw_createRandomCar(0);
    car_def.index = 0;
    cw_carGeneration.push(car_def);

    // COMPETITOR CARS
    for (var k = 1; k < generationSize; k++) {
        var car_def = cw_createRandomCar();
        car_def.index = k;
        cw_carGeneration.push(car_def);
    }

    gen_counter      = 0;
    cw_deadCars      = 0;
    leaderPosition   = {};
    leaderPosition.x = 0;
    leaderPosition.y = 0;

    cw_materializeGeneration();

    document.getElementById("generation").innerHTML =
        "<strong>Generations: </strong>0";
    document.getElementById("population").innerHTML =
        "<strong>Cars Alive: </strong>"+generationSize;

    ghost = ghost_create_ghost();
}

function cw_materializeGeneration() {
  cw_carArray = [];
  for(var k = 0; k < generationSize; k++) {
    cw_carArray.push(new cw_Car(cw_carGeneration[k]));
  }
}

function cw_nextGeneration() {

  var newGeneration = [];
  var newborn;
  var sent = false;
  cw_getChampions();
  cw_topScores.push({i:gen_counter,v:cw_carScores[0].v,x:cw_carScores[0].x,y:cw_carScores[0].y,y2:cw_carScores[0].y2});
  plot_graphs();
  for(var k = 0; k < gen_champions; k++) {
    cw_carScores[k].car_def.is_elite = true;
    cw_carScores[k].car_def.index = k;

    // Only transmit #1 Top
    if (!sent && !cw_carScores[k].car_def.remoted) {
        car_encode(cw_carScores[k]);
        send( "champion", cw_carScores[k] );
        sent = true;
    }
    newGeneration.push(cw_cleanCar(cw_carScores[k].car_def));
  }
  for (k = gen_champions; k < generationSize; k++) {
    var parent1 = cw_getParents();
    var parent2 = parent1;

    while(parent2 == parent1) {
      parent2 = cw_getParents();
    }

    newborn = cw_makeChild(cw_carGeneration[parent1],cw_carGeneration[parent2]);
    newborn = cw_mutate(newborn);
    newborn.is_elite = false;
    newborn.uuid = cw_carGeneration[parent1].uuid.slice(-3) + PUBNUB.uuid().slice(-3);
    newborn.index = k;
    newGeneration.push(newborn);
  }
  cw_carScores = [];
  cw_carGeneration = newGeneration;
  gen_counter++;
  cw_materializeGeneration();
  cw_deadCars = 0;
  leaderPosition = {};
  leaderPosition.x = 0;
  leaderPosition.y = 0;
  document.getElementById("generation").innerHTML =
    "<strong>Generations: </strong>"+gen_counter;
  document.getElementById("cars").innerHTML = "";
  document.getElementById("population").innerHTML =
    "<strong>Cars Alive: <strong>"+generationSize;
}

function unique(arr) {
   var u = {}, a = [];
   for (var i = 0, l = arr.length; i < l; ++i) {
      if (u.hasOwnProperty(arr[i].v)) continue;
      a.push(arr[i]);
      u[arr[i].v] = 1;
   }
   return a;
}

function cw_getChampions() {
  var ret = [];
  PUBNUB.each( cw_carScores, function(a) { if (a.v > 300) a.v = 300 } );
  cw_carScores.sort(function(a,b) {if(a.v > b.v) {return -1} else {return 1}});
  cw_carScores = unique(cw_carScores);
  for(var k = 0; k < generationSize; k++) {
    ret.push(cw_carScores[k]);
  }
  return ret;
}

function cw_getParents() {
  var parentIndex = -1;
  for(var k = 0; k < generationSize; k++) {
    if(Math.random() <= gen_parentality) {
      parentIndex = k;
      break;
    }
  }
  if(parentIndex == -1) {
    parentIndex = Math.round(Math.random()*(generationSize-1));
  }
  return parentIndex;
}

function cw_makeChild(car_def1, car_def2) {
  var newCarDef = {};
  swapPoint1 = Math.round(Math.random()*(nAttributes-1));
  swapPoint2 = swapPoint1;
  while(swapPoint2 == swapPoint1) {
    swapPoint2 = Math.round(Math.random()*(nAttributes-1));
  }
  var parents = [car_def1, car_def2];
  var curparent = 0;

  curparent = cw_chooseParent(curparent,0);
  newCarDef.wheel_radius1 = parents[curparent].wheel_radius1;
  curparent = cw_chooseParent(curparent,1);
  newCarDef.wheel_radius2 = parents[curparent].wheel_radius2;

  curparent = cw_chooseParent(curparent,2);
  newCarDef.wheel_vertex1 = parents[curparent].wheel_vertex1;
  curparent = cw_chooseParent(curparent,3);
  newCarDef.wheel_vertex2 = parents[curparent].wheel_vertex2;

  newCarDef.vertex_list = [];
  curparent = cw_chooseParent(curparent,4);
  newCarDef.vertex_list[0] = parents[curparent].vertex_list[0];
  curparent = cw_chooseParent(curparent,5);
  newCarDef.vertex_list[1] = parents[curparent].vertex_list[1];
  curparent = cw_chooseParent(curparent,6);
  newCarDef.vertex_list[2] = parents[curparent].vertex_list[2];
  curparent = cw_chooseParent(curparent,7);
  newCarDef.vertex_list[3] = parents[curparent].vertex_list[3];
  curparent = cw_chooseParent(curparent,8);
  newCarDef.vertex_list[4] = parents[curparent].vertex_list[4];
  curparent = cw_chooseParent(curparent,9);
  newCarDef.vertex_list[5] = parents[curparent].vertex_list[5];
  curparent = cw_chooseParent(curparent,10);
  newCarDef.vertex_list[6] = parents[curparent].vertex_list[6];
  curparent = cw_chooseParent(curparent,11);
  newCarDef.vertex_list[7] = parents[curparent].vertex_list[7];

  curparent = cw_chooseParent(curparent,12);
  newCarDef.wheel_density1 = parents[curparent].wheel_density1;
  curparent = cw_chooseParent(curparent,13);
  newCarDef.wheel_density2 = parents[curparent].wheel_density2;

  return newCarDef;
}

function cw_mutate(car_def) {

  if(Math.random() < gen_mutation)
    car_def.wheel_radius1 = Math.random()*wheelMaxRadius+wheelMinRadius;
  if(Math.random() < gen_mutation)
    car_def.wheel_radius2 = Math.random()*wheelMaxRadius+wheelMinRadius;
  if(Math.random() < gen_mutation)
    car_def.wheel_vertex1 = Math.floor(Math.random()*8)%8;
  if(Math.random() < gen_mutation)
      car_def.wheel_vertex2 = Math.floor(Math.random()*8)%8;
  if(Math.random() < gen_mutation)
    car_def.wheel_density1 = Math.random()*wheelMaxDensity+wheelMinDensity;
  if(Math.random() < gen_mutation)
    car_def.wheel_density2 = Math.random()*wheelMaxDensity+wheelMinDensity;

  if(Math.random() < gen_mutation)
      car_def.vertex_list.splice(0,1,new b2Vec2(Math.random()*chassisMaxAxis + chassisMinAxis,0));
  if(Math.random() < gen_mutation)
      car_def.vertex_list.splice(1,1,new b2Vec2(Math.random()*chassisMaxAxis + chassisMinAxis,Math.random()*chassisMaxAxis + chassisMinAxis));
  if(Math.random() < gen_mutation)
      car_def.vertex_list.splice(2,1,new b2Vec2(0,Math.random()*chassisMaxAxis + chassisMinAxis));
  if(Math.random() < gen_mutation)
      car_def.vertex_list.splice(3,1,new b2Vec2(-Math.random()*chassisMaxAxis - chassisMinAxis,Math.random()*chassisMaxAxis + chassisMinAxis));
  if(Math.random() < gen_mutation)
      car_def.vertex_list.splice(4,1,new b2Vec2(-Math.random()*chassisMaxAxis - chassisMinAxis,0));
  if(Math.random() < gen_mutation)
      car_def.vertex_list.splice(5,1,new b2Vec2(-Math.random()*chassisMaxAxis - chassisMinAxis,-Math.random()*chassisMaxAxis - chassisMinAxis));
  if(Math.random() < gen_mutation)
      car_def.vertex_list.splice(6,1,new b2Vec2(0,-Math.random()*chassisMaxAxis - chassisMinAxis));
  if(Math.random() < gen_mutation)
      car_def.vertex_list.splice(7,1,new b2Vec2(Math.random()*chassisMaxAxis + chassisMinAxis,-Math.random()*chassisMaxAxis - chassisMinAxis));
  return car_def;
}

function cw_chooseParent(curparent, attributeIndex) {
  var ret;
  if((swapPoint1 == attributeIndex) || (swapPoint2 == attributeIndex)) {
    if(curparent == 1) {
      ret = 0;
    } else {
      ret = 1;
    }
  } else {
    ret = curparent;
  }
  return ret;
}

window.cw_setMutation = cw_setMutation;
function cw_setMutation(mutation) {
    gen_mutation = +mutation;
}

window.cw_setEliteSize = cw_setEliteSize;
function cw_setEliteSize(clones) {
    gen_champions = +clones;
}

/* ==== END Genration ====================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  cw_setCameraPosition();
  ctx.translate(200-(camera_x*zoom), 200+(camera_y*zoom));
  ctx.scale(zoom, -zoom);
  cw_drawFloor();
  ghost_draw_frame(ctx, ghost);
  cw_drawCars();
  ctx.restore();
}

function cw_minimapCamera(x, y) {
  minimapcamera.left = Math.round((2+camera_x) * minimapscale) + "px";
  minimapcamera.top = Math.round((31-camera_y) * minimapscale) + "px";
}

window.cw_setCameraTarget = cw_setCameraTarget;
function cw_setCameraTarget(k) {
  camera_target = k;
}

function cw_setCameraPosition() {
  if(camera_target >= 0) {
    var cameraTargetPosition = cw_carArray[camera_target].getPosition();
  } else {
    var cameraTargetPosition = leaderPosition;
  }

  var diff_y = camera_y - cameraTargetPosition.y;
  var diff_x = camera_x - cameraTargetPosition.x;
  camera_y -= cameraspeed * diff_y;
  camera_x -= cameraspeed * diff_x;
  cw_minimapCamera(camera_x, camera_y);
}

function cw_drawGhostReplay() {
  carPosition = ghost_get_position(ghost);
  camera_x = carPosition.x;
  camera_y = carPosition.y;
  cw_minimapCamera(camera_x, camera_y);
  showDistance(Math.round(carPosition.x*100)/100, Math.round(carPosition.y*100)/100);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(200-(carPosition.x*zoom), 200+(carPosition.y*zoom));
  ctx.scale(zoom, -zoom);
  ghost_draw_frame(ctx, ghost);
  ghost_move_frame(ghost);
  cw_drawFloor();
  ctx.restore();
}

function cw_drawFloor() {
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#777";
  ctx.lineWidth = 1/zoom;
  ctx.beginPath();

  outer_loop:
  for(var k = Math.max(0,last_drawn_tile-20); k < cw_floorTiles.length; k++) {
    var b = cw_floorTiles[k];
    for (f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var shapePosition = b.GetWorldPoint(s.m_vertices[0]).x;
      if((shapePosition > (camera_x - 5)) && (shapePosition < (camera_x + 10))) {
        cw_drawVirtualPoly(b, s.m_vertices, s.m_vertexCount);
      }
      if(shapePosition > camera_x + 10) {
        last_drawn_tile = k;
        break outer_loop;
      }
    }
  }
  ctx.fill();
  ctx.stroke();
}

function cw_drawCars() {
  for(var k = (cw_carArray.length-1); k >= 0; k--) {
    myCar = cw_carArray[k];
    if(!myCar.alive) {
      continue;
    }
    myCarPos = myCar.getPosition();

    if(myCarPos.x < (camera_x - 5)) {
      // too far behind, don't draw
      continue;
    }

    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1/zoom;

    b = myCar.wheel1;
    for (f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var color = Math.round(255 - (255 * (f.m_density - wheelMinDensity)) / wheelMaxDensity).toString();
      var rgbcolor = "rgb("+color+","+color+","+color+")";
      cw_drawCircle(b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
    }
    b = myCar.wheel2;
    for (f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var color = Math.round(255 - (255 * (f.m_density - wheelMinDensity)) / wheelMaxDensity).toString();
      var rgbcolor = "rgb("+color+","+color+","+color+")";
      cw_drawCircle(b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
    }

    if(myCar.is_elite) {
      ctx.strokeStyle = "#44c";
      ctx.fillStyle = "#ddf";
    } else {
      ctx.strokeStyle = "#c44";
      ctx.fillStyle = "#fdd";
    }

    var uuid = myCar.car_def.uuid;
    if (uuid) {
      ctx.strokeStyle = "#eeeee2";
      ctx.fillStyle   = "#"+uuid;
    }

    ctx.beginPath();
    var b = myCar.chassis;
    for (f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      cw_drawVirtualPoly(b, s.m_vertices, s.m_vertexCount);
    }
    ctx.fill();
    ctx.stroke();
  }
}

window.toggleDisplay = toggleDisplay;
function toggleDisplay() {
  if(cw_paused) {
    return;
  }
  canvas.width = canvas.width;
  if(doDraw) {
    doDraw = false;
    cw_stopSimulation();
    cw_runningInterval = setInterval(simulationStep, 1); // simulate 1000x per second when not drawing
  } else {
    doDraw = true;
    clearInterval(cw_runningInterval);
    cw_startSimulation();
  }
}

function cw_drawVirtualPoly(body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  // call beginPath before call

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);
}

function cw_drawPoly(body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  ctx.beginPath();

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);

  ctx.fill();
  ctx.stroke();
}

function cw_drawCircle(body, center, radius, angle, color) {
  var p = body.GetWorldPoint(center);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2*Math.PI, true);

  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + radius*Math.cos(angle), p.y + radius*Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

function cw_drawMiniMap() {
  var last_tile = null;
  var tile_position = new b2Vec2(-5,0);
  minimapfogdistance = 0;
  fogdistance.width = "800px";
  minimapcanvas.width = minimapcanvas.width;
  minimapctx.strokeStyle = "#000";
  minimapctx.beginPath();
  minimapctx.moveTo(0,35 * minimapscale);
  for(var k = 0; k < cw_floorTiles.length; k++) {
    last_tile = cw_floorTiles[k];
    last_fixture = last_tile.GetFixtureList();
    last_world_coords = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
    tile_position = last_world_coords;
    minimapctx.lineTo((tile_position.x + 5) * minimapscale, (-tile_position.y + 35) * minimapscale);
  }
  minimapctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */


/* ========================================================================= */
/* ==== Graphs ============================================================= */

function cw_storeGraphScores() {
  cw_graphAverage.push(cw_average(cw_carScores));
  cw_graphElite.push(cw_eliteaverage(cw_carScores));
  cw_graphTop.push(cw_carScores[0].v);
}

function cw_plotTop() {
  var graphsize = cw_graphTop.length;
  graphctx.strokeStyle = "#f00";
  graphctx.beginPath();
  graphctx.moveTo(0,0);
  for(var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400*(k+1)/graphsize,cw_graphTop[k]);
  }
  graphctx.stroke();
}

function cw_plotElite() {
  var graphsize = cw_graphElite.length;
  graphctx.strokeStyle = "#0f0";
  graphctx.beginPath();
  graphctx.moveTo(0,0);
  for(var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400*(k+1)/graphsize,cw_graphElite[k]);
  }
  graphctx.stroke();
}

function cw_plotAverage() {
  var graphsize = cw_graphAverage.length;
  graphctx.strokeStyle = "#00f";
  graphctx.beginPath();
  graphctx.moveTo(0,0);
  for(var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400*(k+1)/graphsize,cw_graphAverage[k]);
  }
  graphctx.stroke();
}

function plot_graphs() {
  cw_storeGraphScores();
  cw_clearGraphics();
  cw_plotAverage();
  cw_plotElite();
  cw_plotTop();
  cw_listTopScores();
}


function cw_eliteaverage(scores) {
  var sum = 0;
  for(var k = 0; k < Math.floor(scores.length/2); k++) {
    sum += scores[k].v;
  }
  return sum/Math.floor(scores.length/2);
}

function cw_average(scores) {
  var sum = 0;
  for(var k = 0; k < scores.length; k++) {
    sum += scores[k].v;
  }
  return sum/scores.length;
}

function cw_clearGraphics() {
  graphcanvas.width = graphcanvas.width;
  graphctx.translate(0,graphheight);
  graphctx.scale(1,-1);
  graphctx.lineWidth = 1;
  graphctx.strokeStyle="#888";
  graphctx.beginPath();
  graphctx.moveTo(0,graphheight/2);
  graphctx.lineTo(graphwidth, graphheight/2);
  graphctx.moveTo(0,graphheight/4);
  graphctx.lineTo(graphwidth, graphheight/4);
  graphctx.moveTo(0,graphheight*3/4);
  graphctx.lineTo(graphwidth, graphheight*3/4);
  graphctx.stroke();
}

function cw_listTopScores() {
  var ts = document.getElementById("topscores");
  ts.innerHTML = "Top Scores:<br />";
  cw_topScores.sort(function(a,b) {if(a.v > b.v) {return -1} else {return 1}});
  for(var k = 0; k < Math.min(10,cw_topScores.length); k++) {
    document.getElementById("topscores").innerHTML += "#"+(k+1)+": "+Math.round(cw_topScores[k].v*100)/100+" d:"+Math.round(cw_topScores[k].x*100)/100+" h:"+Math.round(cw_topScores[k].y2*100)/100+"/"+Math.round(cw_topScores[k].y*100)/100+"m (gen "+clean(cw_topScores[k].i)+")<br />";
  }
}

/* ==== END Graphs ========================================================= */
/* ========================================================================= */

function simulationStep() {
  world.Step(1/box2dfps, 20, 20);
  ghost_move_frame(ghost);
  for(var k = 0; k < generationSize; k++) {
    if(!cw_carArray[k].alive) {
      continue;
    }
    ghost_add_replay_frame(cw_carArray[k].replay, cw_carArray[k]);
    cw_carArray[k].frames++;
    position = cw_carArray[k].getPosition();
    cw_carArray[k].minimapmarker.left = Math.round((position.x+5) * minimapscale) + "px";

    cw_carArray[k].healthBar.width = Math.round((cw_carArray[k].health/max_car_health)*100) + "%";
    if(cw_carArray[k].checkDeath()) {
      cw_carArray[k].kill();
      cw_deadCars++;
      document.getElementById("population").innerHTML =
        "<strong>Cars Alive: </strong>" + (generationSize-cw_deadCars);
      if(cw_deadCars >= generationSize) {
        cw_newRound();
      }
      if(leaderPosition.leader == k) {
        // leader is dead, find new leader
        cw_findLeader();
      }
      continue;
    }
    if(position.x > leaderPosition.x) {
      leaderPosition = position;
      leaderPosition.leader = k;
    }
  }
  showDistance(Math.round(leaderPosition.x*100)/100, Math.round(leaderPosition.y*100)/100);
}

function cw_findLeader() {
  var lead = 0;
  for(var k = 0; k < cw_carArray.length; k++) {
    if(!cw_carArray[k].alive) {
      continue;
    }
    position = cw_carArray[k].getPosition();
    if(position.x > lead) {
      leaderPosition = position;
      leaderPosition.leader = k;
    }
  }
}

function cw_newRound() {
//  cw_stopSimulation();
//   for (b = world.m_bodyList; b; b = b.m_next) {
//     world.DestroyBody(b);
//   }
//   // world = new b2World(gravity, doSleep);
//   cw_createFloor();
  cw_nextGeneration();
  ghost_reset_ghost(ghost);
  camera_x = camera_y = 0;
  cw_setCameraTarget(-1);
//  cw_startSimulation();
}

function cw_startSimulation() {
  cw_runningInterval = setInterval(simulationStep, Math.round(1000/box2dfps));
  cw_drawInterval = setInterval(cw_drawScreen, Math.round(1000/screenfps));
}

function cw_stopSimulation() {
  clearInterval(cw_runningInterval);
  clearInterval(cw_drawInterval);
}

function cw_kill() {
  var avgspeed = (myCar.maxPosition / myCar.frames) * box2dfps;
  var position = myCar.maxPosition;
  var score = position + avgspeed;
  document.getElementById("cars").innerHTML += Math.round(position*100)/100 + "m + " +" "+Math.round(avgspeed*100)/100+" m/s = "+ Math.round(score*100)/100 +"pts<br />";
  ghost_compare_to_replay(replay, ghost, score);
  cw_carScores.push({ i:current_car_index, v:score, s: avgspeed, x:position, y:myCar.maxPositiony, y2:myCar.minPositiony });
  current_car_index++;
  cw_killCar();
  if(current_car_index >= generationSize) {
    cw_nextGeneration();
    current_car_index = 0;
  }
  myCar = cw_createNextCar();
  last_drawn_tile = 0;
}

window.cw_resetPopulation = cw_resetPopulation;
function cw_resetPopulation() {

  document.getElementById("generation").innerHTML = "";
  document.getElementById("cars").innerHTML       = "";
  document.getElementById("topscores").innerHTML  = "";

  cw_clearGraphics();
  cw_carArray      = [];
  cw_carGeneration = [];
  cw_carScores     = [];
  cw_topScores     = [];
  cw_graphTop      = [];
  cw_graphElite    = [];
  cw_graphAverage  = [];

  lastmax          = 0;
  lastaverage      = 0;
  lasteliteaverage = 0;
  swapPoint1       = 0;
  swapPoint2       = 0;

  cw_generationZero();
}

function cw_resetWorld() {
  remotecarsnum = 0;
  floorseed = document.getElementById("newseed").value;
  connect_world(floorseed);

  cw_stopSimulation();
  for (b = world.m_bodyList; b; b = b.m_next) {
    world.DestroyBody(b);
  }

  Math.seedrandom(floorseed);
  cw_createFloor();
  cw_drawMiniMap();
  Math.seedrandom();
  cw_resetPopulation();
  cw_startSimulation();
}

window.cw_confirmResetWorld = cw_confirmResetWorld;
function cw_confirmResetWorld() {

  if(confirm('Okay Join This World?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

// ghost replay stuff

function cw_pauseSimulation() {
  cw_paused = true;
  clearInterval(cw_runningInterval);
  clearInterval(cw_drawInterval);
  old_last_drawn_tile = last_drawn_tile;
  last_drawn_tile = 0;
  ghost_pause(ghost);
}

function cw_resumeSimulation() {
  cw_paused = false;
  ghost_resume(ghost);
  last_drawn_tile = old_last_drawn_tile;
  cw_runningInterval = setInterval(simulationStep, Math.round(1000/box2dfps));
  cw_drawInterval = setInterval(cw_drawScreen, Math.round(1000/screenfps));
}

function cw_startGhostReplay() {
  if(!doDraw) {
    toggleDisplay();
  }
  cw_pauseSimulation();
  cw_ghostReplayInterval = setInterval(cw_drawGhostReplay,Math.round(1000/screenfps));
}

function cw_stopGhostReplay() {
  clearInterval(cw_ghostReplayInterval);
  cw_ghostReplayInterval = null;
  cw_findLeader();
  camera_x = leaderPosition.x;
  camera_y = leaderPosition.y;
  cw_resumeSimulation();
}

function cw_toggleGhostReplay(button) {
  if(cw_ghostReplayInterval == null) {
    cw_startGhostReplay();
    button.value = "Resume simulation";
  } else {
    cw_stopGhostReplay();
    button.value = "View top replay";
  }
}
// ghost replay stuff END

// initial stuff, only called once (hopefully)
function cw_init() {
  // clone silver dot and health bar
  var mmm = document.getElementsByName('minimapmarker')[0];
  var hbar = document.getElementsByName('healthbar')[0];

  for(var k = 0; k < generationSize; k++) {

    // minimap markers
    var newbar = mmm.cloneNode(true);
    newbar.id = "bar"+k;
    newbar.style.paddingTop = k*9+"px";
    minimapholder.appendChild(newbar);

    // health bars
    var newhealth = hbar.cloneNode(true);
    newhealth.getElementsByTagName("DIV")[0].id = "health"+k;
    newhealth.car_index = k;
    document.getElementById("health").appendChild(newhealth);
  }
  mmm.parentNode.removeChild(mmm);
  hbar.parentNode.removeChild(hbar);
  floorseed = Math.seedrandom();
  world = new b2World(gravity, doSleep);
  cw_createFloor();
  cw_drawMiniMap();
  cw_generationZero();
  cw_runningInterval = setInterval(simulationStep, Math.round(1000/box2dfps));
  cw_drawInterval = setInterval(cw_drawScreen, Math.round(1000/screenfps));
}

cw_init();

})();
})();

// TODO : we shouldn't need this imported here, only as dependency in daftbot.js
var gpio = require("pi-gpio");

// don't npm install this
// you can, but while developing you should clone this:
// https://github.com/smoochy/daftbot
// and 'npm link' from the project directory
var daftbot = require('daftbot');

var INTERVAL = 33;

var LOW = 0;
var HIGH = 1;

// whisker pins
var RIGHT_WHISKER_IN = 16;
var RIGHT_WHISKER_OUT = 18;
var LEFT_WHISKER_IN = 11;
var LEFT_WHISKER_OUT = 13;

// motor pins
var RIGHT_MOTOR_1 = 12;
var RIGHT_MOTOR_2 = 22;
var LEFT_MOTOR_1 = 7;
var LEFT_MOTOR_2 = 15;


// car brain - this commands and manages the motors in aggregate
// @param Array 'motors' - array of Motor objects
// @param Array 'whiskers' - array of Whisker objects
//
var KnightRider = function(motors, whiskers){
  this.whiskers = whiskers || [];

  this.leftMotor = motors.leftMotor;
  this.rightMotor = motors.rightMotor;

  this.motors = [];
  this.addMotor(this.leftMotor);
  this.addMotor(this.rightMotor);

  this.state = "forward";
};

KnightRider.prototype.addMotor = function(motor){
  this.motors.push(motor);
};

KnightRider.prototype.addWhisker = function(whisker){
  this.whiskers.push(whisker);
};

KnightRider.prototype.forward = function(){
  console.log("setting vehicle forward");
  for (var i = 0, len = this.motors.length; i < len; i++){
    this.motors[i].forward();
  }
};

KnightRider.prototype.reverse = function(){
  for (var i = 0, len = this.motors.length; i < len; i++){
    this.motors[i].reverse();
  }
};

KnightRider.prototype.halt = function(){
  for (var i = 0, len = this.motors.length; i < len; i++){ 
    this.motors[i].halt();
  } 
};

KnightRider.prototype.right = function(){
  this.halt();
  this.leftMotor.forward();
  this.rightMotor.reverse();
};

KnightRider.prototype.left = function(){
  this.halt();
  this.rightMotor.forward();
  this.leftMotor.reverse();
};

KnightRider.prototype.rotate = function(){
    this.left();
};

KnightRider.prototype.startEngine = function(){
  for (var i = 0, len = this.motors.length; i < len; i++){
    this.motors[i].enable();
  }
  for (var i = 0, len = this.whiskers.length; i < len; i++){
    this.whiskers[i].enable();
  }
};


KnightRider.prototype.checkWhiskers = function(){
  // if this.state !== "forward"{
  //   return;
  // }

  var carBrain = this;
  var whiskers = this.whiskers;

  for (var i = 0, len = whiskers.length; i < len; i++){
    var whisker = whiskers[i];
    console.log( "reading from pin " + whisker.pinIn );
    gpio.read(whisker.pinIn, function(err, value){
      console.log(value);
      if (value === HIGH){
        // we have a collision, reset
        carBrain.reset();
      }
    });
  }

};

// intiates a state sequence that resets the robot
// to forward in a different direction.
KnightRider.prototype.reset = function(){
  var vehicle = this;

  // stop robot immediately ( t = 0 seconds )
  vehicle.state = "halt";

  // t = 1 : go in reverse 
  setTimeout(function(){
    vehicle.state = "reverse";
  }, 1000);

  // t = 1.5 : stop again 
  setTimeout(function(){
    vehicle.state = "halt"
  }, 1500);

  // t = 2 : rotate
  setTimeout(function(){
    vehicle.state = "rotate"
  }, 2000);

  // t = 3.5 : stop again
  setTimeout(function(){
    vehicle.state = "halt"
  }, 3500);

  // t = 4: stop again
  setTimeout(function(){
    vehicle.state = "forward"
  }, 4000);
};

// runs in loop; checks whiskers and turns robot if
// we detect a whisker collision
KnightRider.prototype.update = function(){

  console.log("vehicle state: " + this.state);
  // check object state
  if (this.state === "forward"){
    this.forward();
    this.checkWhiskers();
  } else if (this.state === "halt"){
    this.halt();
  } else if (this.state === "reverse") {
    this.reverse();
  } else if (this.state === "rotate") {
    this.rotate();
  }

};



// TODO: we can dispense with the factories,
// they really aren't adding much value.
// Either that or move into daftbot
console.log("creating MOTORS!");
// motor factory class for spawning motors
var MotorMaker = function(){
};

MotorMaker.prototype.motorClass = daftbot.Motor;

MotorMaker.prototype.createMotor = function(pins){
  return new this.motorClass(pins);
};

var motorMaker = new MotorMaker();

var leftMotorPins = {
  motor_1 : LEFT_MOTOR_1,
  motor_2 : LEFT_MOTOR_2
};

var rightMotorPins = {
  motor_1 : RIGHT_MOTOR_1,
  motor_2 : RIGHT_MOTOR_2
};

var rightMotor = motorMaker.createMotor(rightMotorPins);
var leftMotor = motorMaker.createMotor(leftMotorPins);

var knightRider = new KnightRider({
  leftMotor : leftMotor,
  rightMotor : rightMotor
});

console.log(knightRider.motors.length);

console.log("creating WHISKERS!");
// whisker factory class
var WhiskerMaker = function(){
};

WhiskerMaker.prototype.whiskerClass = daftbot.Whisker;

WhiskerMaker.prototype.createWhisker = function(pins){
  return new this.whiskerClass(pins);
};

var whiskerMaker = new WhiskerMaker();

var leftWhiskerPins = {
  pinIn : LEFT_WHISKER_IN,
  out : LEFT_WHISKER_OUT
};

var rightWhiskerPins = {
  pinIn : RIGHT_WHISKER_IN,
  out : RIGHT_WHISKER_OUT
};

var rightWhisker = whiskerMaker.createWhisker(rightWhiskerPins);
var leftWhisker = whiskerMaker.createWhisker(leftWhiskerPins);

knightRider.addWhisker(rightWhisker);
knightRider.addWhisker(leftWhisker);

console.log(knightRider.whiskers.length);

// this guy runs over and over in continuous loop
var loop = function(){
  knightRider.update(); 
};

var setup = function(){
  console.log("starting engine");
  knightRider.startEngine();  // enable motor and whisker pins

  console.log("forward");
  knightRider.forward();  //tallyho!
  console.log("running loop");
  setInterval(loop, INTERVAL);
};

// start the beast
setup();


// for cleanup on exit
var ALL_PINS = [
  RIGHT_WHISKER_IN,
  RIGHT_WHISKER_OUT,
  LEFT_WHISKER_IN,
  LEFT_WHISKER_OUT,
  RIGHT_MOTOR_1,
  RIGHT_MOTOR_2,
  LEFT_MOTOR_1,
  LEFT_MOTOR_2
];

// close all pins on program exit or ctrl-c
// src: http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup){
      for (var i = 0; i < ALL_PINS.length; i++){
        gpio.close(ALL_PINS[i]);
      }
    }
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

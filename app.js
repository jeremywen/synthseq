String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
Array.prototype.contains = function ( needle ) { for (i in this) { if (this[i] == needle) return true; } return false; }

var bpm = 128;
var maxCols = 8;
var maxRows = 11;
var blocks = [];
var visibleGrid = 0;
var controlRowCount = 2;
var blockSize = Math.floor((window.innerWidth)/maxCols);
var halfBlock = blockSize / 2;
var totalWidth = maxCols * blockSize;
var totalHeight = maxRows * blockSize;
var ua = navigator.userAgent;
var isFirefoxOS = ua.contains("Firefox") && ua.contains("Mobile");

///////////////////////////////////////////////////////////////////////////////////////////////
// audio
///////////////////////////////////////////////////////////////////////////////////////////////
sc.use("prototype");   
timbre.setup({f64:true});
console.log("timbre.samplerate = ",timbre.samplerate);

if (isFirefoxOS) { 
  bpm = 60;
  timbre.setup({samplerate:timbre.samplerate * 0.25}); 
  console.log("reduced timbre.samplerate = ",timbre.samplerate);
}

function runSequencer(){
  var scale = new sc.Scale.minor();
  var env = T("perc", {r:75});
  var arp  = T("OscGen", {env:env, wave:"sin(15)", mul:0.5});
  arp.play();

  T("interval", {interval:"BPM" + bpm + " L16"}, function(count) {
    var col = count % maxCols;
    for(var i=0;i<blocks.length;i++){
      var block = blocks[i];
      if(!block.control && col==block.gridX && block.isEnabled()){
        if(!isFirefoxOS)block.trigger();
        var height = block.gridHeight();
        var heightOctave = Math.floor(height / scale.size());
        var noteNum = scale.wrapAt(height) + 48 + (12*heightOctave);

        arp.noteOn(noteNum + 12, 60);
      }
    }
  }).start();
}

var onreset = function() {};
timbre.on("play", function(){});
timbre.on("pause", onreset);
timbre.on("reset", onreset);
timbre.amp = 0.7;

function playStopSequencer() {
  if (timbre.isPlaying) {
      timbre.reset();
      timbre.pause();
  } else {
      timbre.reset();
      runSequencer();
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////
// one block
///////////////////////////////////////////////////////////////////////////////////////////////
var Block = function(gridX,gridY){
  var me = this;
  this.enabled = false;
  this.control = gridY == 0 || gridY == maxRows-1;
  this.gridX = gridX;
  this.gridY = gridY;
  this.west = me.gridX * blockSize;
  this.north = me.gridY * blockSize;
  this.east = me.west + blockSize;
  this.south = me.north + blockSize;
  this.triggerFade = 0;
  this.clickFunc;
  this.postDrawFunc;

  this.draw = function (){
    if(me.control) {
      me.isEnabled() ? p.fill(251,174,83) : p.fill(231,144,53);
      // if(!me.clickFunc){ p.fill( 0) }
    } else {
      me.isEnabled() ? p.fill(60 + me.triggerFade,186 + me.triggerFade,232) : p.fill(10,60,100);
    }

    p.rect(me.west, me.north, blockSize, blockSize, !me.control && me.isEnabled() ? 10 : 0);

    if(me.postDrawFunc) { me.postDrawFunc(); }
    if(me.triggerFade>0){ me.triggerFade-=10; } else { me.triggerFade=0; }
  }

  this.trigger = function(){
    me.triggerFade = 200;
  }

  this.handleClick = function(){
    if(me.control){
      if(me.clickFunc){
        me.clickFunc();
        setRowEnabled(me.gridY, false);
        if(isFirefoxOS)p.draw();
      }
    } else {
      me.setEnabled(!me.isEnabled());
      if(isFirefoxOS)me.draw();
    }
  }

  this.setEnabled = function(enabled){
    me.enabled = enabled;
  }

  this.isEnabled = function(){
    return me.enabled;
  }

  this.gridHeight = function(){
    return maxRows-controlRowCount-gridY; 
  }

  this.contains = function(x,y){
    return x > me.west && x < me.east && y > me.north && y < me.south;
  }
};


///////////////////////////////////////////////////////////////////////////////////////////////
// block grid utils
///////////////////////////////////////////////////////////////////////////////////////////////
function getBlock(gridX, gridY){
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    if(block.gridX== gridX && block.gridY==gridY){
      return block;
    }
  }  
}

function setRowEnabled(gridY, enabled){
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    if(block.gridY==gridY){
      block.setEnabled(enabled);
    }
  }  
}

function getColVal(gridX){
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    if(block.gridX==gridX && block.isEnabled()){
      return block.gridHeight();
    }
  }  
  return -1;
}

function randomizeSin(){
  clearSequencer();
  var rndMult = Math.random()/100;
  for(var x=0;x<maxCols;x++){
    var y = Math.floor(Math.sin(x*rndMult) * (maxRows/2) + 1 + (Math.random()*(maxRows-2)));
    var block = getBlock(x,y);
    if(!block.control){
      block.setEnabled(true);
    }
  }
}

function flipVertical(){
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    if(!block.control && block.isEnabled()){
      //using tempEnabled so grid isn't changed inside this loop
      getBlock(block.gridX,maxRows-1-block.gridY).tempEnabled = true;
    }
  }
  clearSequencer();
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    if(!block.control && block.tempEnabled){
      block.setEnabled(true);
      block.tempEnabled = false;
    }
  }
}


function flipHorizontal(){
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    if(!block.control && block.isEnabled()){
      //using tempEnabled so grid isn't changed inside this loop
      getBlock(maxCols-1-block.gridX,block.gridY).tempEnabled = true;
    }
  }
  clearSequencer();
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    if(!block.control && block.tempEnabled){
      block.setEnabled(true);
      block.tempEnabled = false;
    }
  }
}


function clearSequencer(){
  for(var i=0;i<blocks.length;i++){
    var block = blocks[i];
    if(!block.control){
      block.setEnabled(false);
    }
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////
// controls
///////////////////////////////////////////////////////////////////////////////////////////////
function setupTopControls(){
  var blockX = 0;
  
  var playStopBlock = getBlock(blockX,0);
  playStopBlock.clickFunc = playStopSequencer;
  playStopBlock.postDrawFunc = function(){
    p.fill(255);
    p.textSize(18);
    if(timbre.isPlaying){
      p.text("▆", playStopBlock.west+halfBlock, playStopBlock.north+halfBlock+2);
    } else {
      p.text("▶", playStopBlock.west+halfBlock, playStopBlock.north+halfBlock+7);
    }
  }
  blockX++;

  var randomizeBlock = getBlock(blockX,0);
  randomizeBlock.clickFunc = randomizeSin;
  randomizeBlock.postDrawFunc = function(){
    p.fill(255);
    p.textSize(30);
    p.text("⚄", randomizeBlock.west+halfBlock, randomizeBlock.north+halfBlock+10);
  }
  blockX++;

  var flipVertBlock = getBlock(blockX,0);
  flipVertBlock.clickFunc = flipVertical;
  flipVertBlock.postDrawFunc = function(){
    p.fill(255);
    p.textSize(30);
    p.text("↕", flipVertBlock.west+halfBlock, flipVertBlock.north+halfBlock+10);
  }
  blockX++;

  var flipHorizBlock = getBlock(blockX,0);
  flipHorizBlock.clickFunc = flipHorizontal;
  flipHorizBlock.postDrawFunc = function(){
    p.fill(255);
    p.textSize(30);
    p.text("↔", flipHorizBlock.west+halfBlock, flipHorizBlock.north+halfBlock+10);
  }
  blockX++;

  var clearBlock = getBlock(blockX,0);
  clearBlock.clickFunc = clearSequencer;
  clearBlock.postDrawFunc = function(){
    p.fill(255);
    p.textSize(30);
    p.text("✖", clearBlock.west+halfBlock, clearBlock.north+halfBlock+10);
  }
  blockX++;

  //TODO: control for increasing BPM
  //TODO: control for decreasing BPM
  //TODO: control for play direction change: left, right, bounce

}

function setupBottomControls(){
}


///////////////////////////////////////////////////////////////////////////////////////////////
// processing sketch
///////////////////////////////////////////////////////////////////////////////////////////////
function processingSketch(p){
  p.setup = function(){
    p.size(totalWidth, totalHeight);
    p.background(255);
    p.textAlign(p.CENTER);
    p.strokeWeight(2);
    p.stroke(0);
    p.fill(30,200,230);
    for(var y=0;y<maxRows;y++){
      for(var x=0;x<maxCols;x++){
        var block = new Block(x,y);
        blocks.push(block);
      }
    }
    setupTopControls();    
    setupBottomControls();    
  }
  
  p.draw = function(){
    blocks.forEach(function(b){
      b.draw();
    });    
    if(isFirefoxOS)p.noLoop();
  }

  p.mouseClicked = function(){
    blocks.forEach(function(b){
      if(b.contains(p.mouseX,p.mouseY)){
        b.handleClick();
        return false;
      }
    });        
  }

}

var canvas = document.getElementById('seqCanvas');
canvas.width = totalWidth;
canvas.height = totalHeight;

var p = new Processing(canvas, processingSketch);

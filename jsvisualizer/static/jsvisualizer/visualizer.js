// from MDN's http://mdn.github.io/voice-change-o-matic/

window.onload = function() {

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.mediaDevices.getUserMedia ||
                          navigator.msGetUserMedia);

// forked web audio context, for multiple browsers
var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
if(audioCtx) {
  console.log("Audio context works!");
}

// voice select for effects
var voiceSelect = document.getElementById("voice");
var source;
var stream;

var mute = document.getElementsByClassName('mute-button')[0];

// set up the different audio nodes for the app
var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

var distortion = audioCtx.createWaveShaper();
var gainNode = audioCtx.createGain();
var biquadFilter = audioCtx.createBiquadFilter();
var convolver = audioCtx.createConvolver();

// distortion curve for the waveshaper, by Kevin Ennis
// http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion

function makeDistortionCurve(amount) {
  var k = typeof amount == 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for ( ; i < n_samples; ++i) {
    x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
};

// grab audio track via XMR for convolver node
// TODO soundSource dosen't work so either try delete-ing intro track or somehow enable iit

var soundSource, concertHallBuffer;

ajaxRequest = new XMLHttpRequest();

ajaxRequest.open('GET', 'http://mdn.github.io/voice-change-o-matic/audio/concert-crowd.ogg', true);

ajaxRequest.responseType = 'arraybuffer';

ajaxRequest.onload = function() {
  var audioData = ajaxRequest.response;

  audioCtx.decodeAudioData(audioData, function(buffer) {
    concertHallBuffer = buffer;
    soundSource = audioCtx.createBufferSource();
    soundSource.buffer = concertHallBuffer;
  }, function(e){"Error with decoding audio data" + e.err});

  //soundSource.connect(audioCtx.destination);
  //soundSource.loop = true;
  //soundsource.start();
}

ajaxRequest.send();

// set up canvas context for visualizer

var canvas = document.querySelector('.visualizer');
var canvasCtx = canvas.getContext("2d");

var intendedWidth = document.querySelector('.wrapper').clientWidth;

canvas.setAttribute('width', intendedWidth);

var intendedHeight = window.innerHeight;
canvas.setAttribute('height', intendedHeight);

var visualSelect = document.getElementById("visual");

var drawVisual;

// main block for doing the audio recording
function beginUserMedia() {
  if (navigator.getUserMedia) {

    navigator.getUserMedia (
      // constraints - only audio needed for this app
      {
        audio: true
      },
      // Success callback
      function(stream) {
  	  console.log("made it to the stream");
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.connect(distortion);;
        distortion.connect(biquadFilter);
        biquadFilter.connect(gainNode);

        // convolver dosen't work for some reason
        // goin to put it in the todo
        //convolver.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        console.log(distortion.curve);
        console.log(distortion.oversample);

        visualize();
        //voiceChange();
      },

      // Error callback
      function(err){
        console.log("The following gUM error occured: " + err);
      }
    );
  } else {
    console.log('getUserMedia not supported on your browser!');
  }
}

beginUserMedia();

function visualize() {
  // changed fullscreen with css, might work on a JS solution
  //WIDTH = window.innerWidth;
  //HEIGHT = window.innerHeight;

  WIDTH = canvas.width;
  HEIGHT= canvas.height;

  var visualSetting = visualSelect.value;
  console.log(visualSetting);

  if(visualSetting == "sinewave") {
    analyser.fftSize = 2048;
    var bufferLength = analyser.fftSize;
    console.log(bufferLength);
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {

      drawVisual = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(200, 200, 200)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

      canvasCtx.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT/2;

        if(i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height/2);
      canvasCtx.stroke();
    };

    draw();

  } else if(visualSetting == 'frequencybars') {
    analyser.fftSize = 256;
    var bufferLength = analyser.frequencyBinCount;
    console.log(bufferLength);
    var dataArray = new Uint8Array(bufferLength);
    gotData = false;

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
      drawVisual = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      if(gotData == false) {
        console.log(dataArray);
        gotData = true;
      }
      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      var barWidth = (WIDTH / bufferLength) * 2.5;
      var barHeight;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
        canvasCtx.fillRect(x,HEIGHT - barHeight/2,barWidth,barHeight/2);

        x += barWidth + 1;
      }
    };

    draw();

  }else if(visualSetting == "sinewave_enchanced"){
    analyser.fftSize = 2048;
    var bufferLength = analyser.fftSize;
    console.log(bufferLength);
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {

      drawVisual = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgba(253,231,31, 0.2)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 4;
      canvasCtx.strokeStyle = 'rgba(1,139,27, 0.2)';

      canvasCtx.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT/2;

        if(i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height/2);
      canvasCtx.stroke();
    };

    draw();
  }else if(visualSetting == "off") {
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.fillStyle = "green";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  }

}

mute.onclick = function(){
  console.log(gainNode);
  voiceMute();
}

// Effect change functions

function voiceChange() {

  console.log(distortion.curve);
  biquadFilter.gain.value = 0;
  //convlver.buffer = "";

  //check for defaults
  distortion.curve = null;
  distortion.oversample = 'none';

  var voiceSetting = voiceSelect.value;
  console.log(voiceSetting);
  if(voiceSetting == "distortion"){
    console.log("distortion turned on!");
    //oversample seemed like a good idea, but the sound was off on guitar
    //distortion.oversample = '4x';
    distortion.curve = makeDistortionCurve(400);
  } else if(voiceSetting == "biquad") {
    biquadFilter.type = "lowshelf";
    biquadFilter.frequency.value = 1000;
    biquadFilter.gain.value = 25;
  } else if(voiceSetting == "off") {
    console.log("voice effect is turned off!");
  }
}

// event listeners to change visualize and voice settings

visualSelect.onchange = function() {
  window.cancelAnimationFrame(drawVisual);
  visualize();
}

voiceSelect.onchange = function() {
  voiceChange();
}

function voiceMute() {
  console.log(gainNode);
  console.log(source);
  if(mute.id == "") {
    console.log("gain disabling" + this);
    source.disconnect(analyser);
    gainNode.gain.value = 0;
    console.log("gain disabled" + gainNode.gain.value);
    mute.id = "activated";
    mute.innerHTML = "Unmute";
  } else {
    source.connect(analyser);
    gainNode.gain.value = 1;
    mute.id = "";
    mute.innerHTML = "Mute";
  }
}

// Fullscreen mode
var canvasVis = document.getElementsByClassName("canvaswrap")[0];
function toggleFullScreen() {
  if(!document.mozFullScreen && !document.webkitFullScreen) {
    if(canvasVis.mozRequestFullScreen) {
      canvasVis.mozRequestFullScreen();
    } else {
      canvasVis.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else{
    if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else {
      document.webkitCancelFullScreen();
    }
  }
}

document.addEventListener("keydown", function(e) {
  if(e.keyCode == 70) {
    toggleFullScreen();
  }
}, false);
};

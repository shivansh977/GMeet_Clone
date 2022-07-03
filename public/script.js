const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})
let myVideoStream
let toolType='draw'
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream)
  myVideoStream=stream
  myPeer.on('call', call => {
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
  })

  socket.on('user-connected', userId => {
    setTimeout(connectToNewUser,1000,userId, stream)
  })
  
  let text=$('input');
  $('html').keydown((e)=>{
    if(e.which==13 && text.val().length!==0){

      socket.emit('message', text.val());
      text.val('');
    }
  })

  socket.on('createMessage', message => {
    console.log(message);
    $('.messages').append(`<li class="message"><b>user</b><br>${message}</li>`);
    scrollToBottom();
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
}

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}

const scrollToBottom = () => {
  let d=$('.main_chat_window');
  d.scrollTop(d.prop("scrollHeight"));
}

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if(enabled){
    myVideoStream.getAudioTracks()[0].enabled=false;
    setUnmuteButton();
  }
  else{
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled=true;
  }

}

const setMuteButton = () => {
  const html = `<i class="fas fa-microphone"></i>
  <span>Mute</span>`
  document.querySelector('.main_mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
  document.querySelector('.main_mute_button').innerHTML = html;
}

const playStop = () => {
  console.log('object')
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo()
  } else {
    setStopVideo()
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
}

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
  document.querySelector('.main_video_button').innerHTML = html;
}

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `
  document.querySelector('.main_video_button').innerHTML = html;
}

const openBoard=() => {
  var canvas = document.querySelector('#canvas');
  console.log(canvas.height);
  if (canvas.height) {
      $('#canvas').css('height','0%');
      canvas.height=0;
      console.log(document.querySelector('#canvas'));
  }
  else {
      canvas.height=236;
      $('#canvas').css('height','33.33%');
  }
}

const drawOption=()=>{
  console.log('Clicked!');
  var txt=document.querySelector('#dyntext');
  if(toolType==='draw'){
    txt.innerHTML='<i class="fa-solid fa-eraser"></i><span>Erase Mode</span>';
    toolType='erase';
  }
  else{
    txt.innerHTML='<i class="fa-solid fa-pen"></i><span>Draw Mode</span>';
    toolType='draw';
  }
}

(function() {
  var canvas = document.querySelector('#canvas');
  var ctx = canvas.getContext('2d');

  var sketch = document.querySelector('#canvas');
  var sketch_style = getComputedStyle(sketch);
  canvas.width = parseInt(sketch_style.getPropertyValue('width'));
  canvas.height = parseInt(sketch_style.getPropertyValue('height'));

  var mouse = {x: 0, y: 0};
  var last_mouse = {x: 0, y: 0};

  socket.on('onDraw', (data) => {
      console.log("called onDraw");
      ctx.lineWidth = 5;
      if (data.tool_type=='erase') ctx.lineWidth=10;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'white';
      if (data.tool_type=='erase') ctx.strokeStyle='#343434';
      ctx.beginPath();
      ctx.moveTo(data.last_mouse.x, data.last_mouse.y);
      ctx.lineTo(data.mouse.x, data.mouse.y);
      ctx.closePath();
      ctx.stroke();
  })

  /* Mouse Capturing Work */
  canvas.addEventListener('mousemove', function(e) {
      last_mouse.x = mouse.x;
      last_mouse.y = mouse.y;

      mouse.x = e.pageX - this.offsetLeft;
      mouse.y = e.pageY - this.offsetTop;
  }, false);


  /* Drawing on Paint App */

  canvas.addEventListener('mousedown', function(e) {
      canvas.addEventListener('mousemove', onPaint, false);
  }, false);

  canvas.addEventListener('mouseup', function() {
      canvas.removeEventListener('mousemove', onPaint, false);
  }, false);

  var onPaint = function() {
      // console.log("painting");
      socket.emit('draw', { mouse: {x: mouse.x, y: mouse.y}, last_mouse: {x: last_mouse.x, y: last_mouse.y}, tool_type: toolType});
      ctx.lineWidth = 5;
      if (toolType=='erase') ctx.lineWidth=10;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'white';
      if (toolType=='erase') ctx.strokeStyle='#343434';
      ctx.beginPath();
      ctx.moveTo(last_mouse.x, last_mouse.y);
      ctx.lineTo(mouse.x, mouse.y);
      ctx.closePath();
      ctx.stroke();
  };

}());
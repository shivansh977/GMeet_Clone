const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const {v4: uuidv4}=require('uuid');
const axios = require("axios");
const cookieParser =require("cookie-parser");
const jwt=require("jsonwebtoken");
const cors=require("cors");
const cron=require("node-cron");
const nodemailer=require("nodemailer");
const COOKIE_NAME='auth_token';
const JWT_SECRET='bnjabhai';

let me;
const users={};
const cons=[];

app.set('view engine','ejs');
app.use(express.static('public'));
app.use(express.json());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());

app.get('/',(req,res)=>{
  res.redirect(`room${uuidv4()}`);
});

app.post('/mail', (req,res)=>{
  const formData=req.body;
  console.log(formData);
  const myMail='nmgmeetclone@gmail.com';
  const transport=nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: myMail,
          pass: 'mzdzhxxxidlhpsdw'
      }
  })
  
  const mailOptions={
      from: myMail,
      to: `${formData.mails}`,
      subject: 'Meet scheduled',
      text: `The Meet is scheduled at ${formData.time}. Discussing upon the following agenda ${formData.agenda}.
      Meeting Link: http://localhost:3000/room${uuidv4()}.`
  }

  transport.sendMail(mailOptions, (err,info) => {
      if (err) {
          console.log(err);
          res.send(err);
      }
      else {
          console.log('Email sent: ' + info.response);
          res.send('success');
      }
  })

  mailOptions.subject='Reminder for scheduled meet';
  let hr=parseInt((formData.time).substr(0,2));
  let min=parseInt((formData.time).substr(3,5));
  min=min-15;
  if (min<0){
      min=60+min;
      hr=hr-1;
      if (hr<0) hr=hr+24;
  }
  cron.schedule(`00 ${min} ${hr} * * *`, () => {
      transport.sendMail(mailOptions, (err,info) => {
          if (err) {
              console.log(err);
              res.send(err);
          }
          else {
              console.log('Email sent: ' + info.response);
              res.send('success');
          }
      })
  });
});

app.get('/room:room', (req,res)=>{
  // console.log("hello");
  if (req.cookies[COOKIE_NAME]!=undefined){
      me=jwt.verify(req.cookies[COOKIE_NAME], JWT_SECRET);
      res.render('room', {roomId: req.params.room, userInfo: me}); 
  }
  else{
      res.cookie("roomId", `${req.params.room}`, {httpOnly: true});
      res.redirect("https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&prompt=consent&response_type=code&client_id=960407959948-ssptqg2g40r8duu48e848bmbsffe5pl8.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fauth%2Fgoogle");
  }
})



app.get('/meetingLeft', (req,res)=>{
  res.sendFile(__dirname + '/public/meetingLeft.html');
});

app.get('/reminder', (req,res)=>{
  res.sendFile(__dirname + '/public/remForm.html');
});

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    cons.push(socket);
    users[userId]=me;

    socket.join(roomId)
    socket.broadcast.to(roomId).emit('user-connected', userId)
    socket.on('message', message => {
      io.to(roomId).emit('createMessage', message)
    })

    socket.on('draw', (data)=> {
      // console.log("socket draw called");
      cons.forEach(con => {
          if (con.id!==socket.id){
              con.emit('onDraw', {
                  mouse: {
                      x: data.mouse.x,
                      y: data.mouse.y
                  },
                  last_mouse: {
                      x: data.last_mouse.x,
                      y: data.last_mouse.y
                  },
                  tool_type: data.tool_type
              })
          }
      });
    })
    socket.on('disconnect', () => {
      socket.broadcast.to(roomId).emit('user-disconnected', userId)
    })
  })
})
server.listen(3000)
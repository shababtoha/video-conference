var express = require('express');
var app = express();

var users = {};
var idToName = {};

var channel = {};

const  port = process.env.PORT || 8080;

var server = app.listen(port,  function() {
    var port = server.address().port;
    console.log('listening to port ' + port);
});

var io = require('socket.io')(server);

io.on('connection', function (socket) {

    io.to(socket.id).emit('newconnection', users);

    ///handle disconnect
    socket.on('disconnect', function() {
        var userName = idToName[socket.id];
        delete idToName[socket.id];
        delete users[userName];
        io.emit('userDisconnected', userName);
        console.log(userName + "disconnected");

    });

    ///handle create room
    socket.on('create', function (newUser) {
        console.log("Request User Creation, username " + newUser);
        if(users.hasOwnProperty(newUser)) {
            console.log("can not create user. already exist");
            return;
        }
        users[newUser] = {
            busy : false,
            socketId : socket.id
        };
        idToName[socket.id] = newUser;
        console.log("new user created. username", users[newUser]);
        io.emit('newUser', newUser);
    });

    socket.on('message', function (message) {
        io.to(channel[socket.id]).emit('message', message);
    });

    socket.on("initiateCall" , function (userName) {
        var userSocketId = users[userName].socketId;
        var intiator = idToName[socket.id];
        users[userName].busy = true;
        users[intiator].busy = true;
        io.to(userSocketId).emit('recievedCall', intiator);
        console.log(idToName[socket.id] + " is calling ", userName);
        channel[socket.id] = userSocketId;
        channel[userSocketId] = socket.id;
    });

    socket.on('recieved' , function (isRecieved) {
        var recievedUserName = idToName[socket.id];
        var initiatorUserName = idToName[channel[socket.id]];
        if(isRecieved){
            console.log(recievedUserName + " recieved ", initiatorUserName+"'s call");
        }
        else {
            var recievedId = socket.id;
            var initiatorId = channel[recievedId];
            delete channel[recievedId];
            delete channel[initiatorId];
            users[recievedUserName].busy = false;
            users[initiatorUserName].busy = false;
        }
        io.to(channel[socket.id]).emit("answer", isRecieved);

    });
});

app.use(express.static('static'));

app.get('/' , (req,res) => {
    res.sendFile(process.cwd()+'/static/index.html');
});

app.get('/videocall', (req,res)=>{
    res.sendFile(process.cwd()+'/static/videoCall.html');
});

app.get("/conference", (req,res) => {
    res.sendFile(process.cwd()+'/static/videoConference.html');
});
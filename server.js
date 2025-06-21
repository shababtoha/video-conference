var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));


var formidable = require('formidable');



var users = {};
var idToName = {};

var channel = {};





let conferenceRooms = {};
let idToRoomName = {};


function getRoomDetails() {
    var roomDetails = {};
    for (var key in conferenceRooms) {
        roomDetails[key] = conferenceRooms[key].length;
    }
    console.log(roomDetails);
    return roomDetails;
}


const  port = process.env.PORT || 8080;

var server = app.listen(port,  function() {
    var port = server.address().port;
    console.log('listening to port ' + port);
});

var io = require('socket.io')(server);

io.of('/call').on('connection', function (socket) {
    //console.log("new connection to call");
    socket.emit('newconnection', users);

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
        io.of('call').emit('newUser', newUser);
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
        console.log('socked id of initiator', socket.id);
        console.log('socked id of receiver', userSocketId);
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

///conference

io.of('/conference').on('connection', function (socket) {
    const socketId = socket.id;
    socket.emit("allrooms", getRoomDetails());

    socket.on('createRoom', function (roomName) {
        console.log("socket Id" , socket.id);
        console.log("Room creation Request . Roomname " + roomName + " id +" , socketId);
        if(roomName === "" || typeof roomName === "undefined" || !roomName) {
            socket.emit("handleError", "invalid Room name");
            return;
        }
        console.log(typeof conferenceRooms[roomName]);
        if(typeof conferenceRooms[roomName] !== "undefined") {
            socket.emit("handleError", "Already Exist");
            return;
        }
        console.log("Room Creation Successful");
        conferenceRooms[roomName] = [];
        conferenceRooms[roomName].push(socketId);
        io.of('conference').emit("newRoom", roomName);
        idToRoomName[socketId] = roomName;
    });

    socket.on('message', function (message, toSocketId) {
        console.log("recieved Message", toSocketId);
        io.of('/conference').to(`${toSocketId}`).emit('message',message, socketId);
    });


    socket.on("joinRoom" , function (roomName) {
       console.log("request to join " + roomName);
       console.log(conferenceRooms[roomName]);


       if(conferenceRooms[roomName] === undefined) {
           socket.emit("handleError", "rooms doesNotExist");
           return;
       }

       console.log("joined room");

       conferenceRooms[roomName].push(socketId);
       idToRoomName[socketId] = roomName;
       io.of('conference').emit("joinedRoom", roomName, socketId);
    });

    socket.on('disconnect', function () {
        var roomName = idToRoomName[socketId];
        if(roomName !== undefined) {
            conferenceRooms[roomName] = conferenceRooms[roomName].filter(val => val != socketId);
            if(conferenceRooms[roomName].length == 0) {
                delete conferenceRooms[roomName];
            }
            io.of('conference').emit("leftRoom", roomName);
        }
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

app.get("/record", (req, res)=>{
    res.sendFile(process.cwd()+'/static/recordRTC.html')
});

app.post("/video", (req,res) =>{
    console.log("request has come")
    var form = new formidable.IncomingForm();
    form.parse(req);
    let date = new Date();
    form.on('fileBegin', function (name, file){
        console.log(file);
        file.path = process.cwd() + '/uploads/' + file.name+"-"+ date ;
    });

    form.on('file', function (name, file){
        console.log('Uploaded ' + file.name);
    });
    res.send("done");
})
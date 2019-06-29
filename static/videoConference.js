'use strict';

var socket = io('/conference');
var peers = {};
const localVideo = document.getElementById('localVideo');
var localStream;
var joining = null;
var creating;

const mediaStreamConstraints = {
    video: true,
    audio : true,
};


// iceServers.push({
//     urls: [ "stun:ss-turn1.xirsys.com" ]
// });
const servers = {
    iceServers : [
        {
            urls: [ "stun:ss-turn1.xirsys.com" ]
        },
        {
            username: "7DYczzEyXySq7SPAcEEAPzMRhrg_UFZ5SpDYDgblZ9zfgIaWlOn03h7LZqU4f0TUAAAAAFz1Dh1zaGFiYWJ0b2hh",
            credential: "85f1ac72-85f8-11e9-88a9-7a7a3a22eac8",
            urls: [
                "turn:ss-turn1.xirsys.com:80?transport=udp",
                "turn:ss-turn1.xirsys.com:3478?transport=udp",
                "turn:ss-turn1.xirsys.com:80?transport=tcp",
                "turn:ss-turn1.xirsys.com:3478?transport=tcp",
                "turns:ss-turn1.xirsys.com:443?transport=tcp",
                "turns:ss-turn1.xirsys.com:5349?transport=tcp"
            ]
        },
        {
            urls: [ "stun:ss-turn2.xirsys.com" ]
        },
        {
            username: "YcUe1q0LAFt5FJaX5gZJzEOacC8_Vy_N9sepbwTt3JCVsQ0OjgDKkIr6RurQORfeAAAAAF0W6XdyYW5kb212ZWdldGFibGU=",
            credential: "aad82740-9a26-11e9-92ad-322c48b34491",
            urls: [
                "turn:ss-turn2.xirsys.com:80?transport=udp",
                "turn:ss-turn2.xirsys.com:3478?transport=udp",
                "turn:ss-turn2.xirsys.com:80?transport=tcp",
                "turn:ss-turn2.xirsys.com:3478?transport=tcp",
                "turns:ss-turn2.xirsys.com:443?transport=tcp",
                "turns:ss-turn2.xirsys.com:5349?transport=tcp"
            ]
        }]
};






socket.on("handleError", function (message) {
    alert(message);
});

socket.on('allrooms', function (rooms) {
     for(var roomName in rooms){
        $("#rooms").append('<li id="'+roomName+'"  ><p style="display: inline-block"> '+ roomName +'</p> <p style="display: inline-block"> current users : <span> '+ rooms[roomName] +' </span> </p> <button onclick=\'join("'+roomName+'")\'> join</button></li>')
    };
    console.log("available rooms", rooms);
});

socket.on('newRoom', function (roomName) {
    console.log("someone Create new room " + roomName);
    $("#rooms").append('<li id="'+roomName+'"  ><p style="display: inline-block"> '+ roomName +'</p>  <p style="display: inline-block"> current users : <span> 1 </span> </p> <button onclick=\'join("'+roomName+'")\'> join</button></li>')
});


socket.on("leftRoom", function (roomName) {
    console.log("Someone left form " + roomName);
    handleRoomUserChange(roomName, -1);

});


socket.on("message", function (message, socketId) {
    console.log("recieved Message", message);
    switch (message.type) {
        case "handShake" :
            createPeerConnection(socketId);
            sendMessage({
                type : "handShakeRecieved"
            },socketId);
            break;
        case "handShakeRecieved":
            sendOffer(peers[socketId], socketId);
            break;
        case "offer":
            peers[socketId].setRemoteDescription(new RTCSessionDescription(message));
            doAnswer(peers[socketId], socketId);
            document.getElementById("screenShare").disabled = false;
            break;
        case "answer":
            peers[socketId].setRemoteDescription(new RTCSessionDescription(message));
            break;
        case 'candidate' :
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: message.label,
                candidate: message.candidate
            });
            peers[socketId].addIceCandidate(candidate);
            break;
        default:
            alert("unwanted msg");
            //console.log(message);
            break;

    }
});


socket.on("joinedRoom", function (roomName, sockedId) {
    console.log(socket.id , sockedId);
    //console.log("someone Jonied room " + roomName);
    handleRoomUserChange(roomName, 1);
    if(sockedId == socket.id) {
        console.log("joinedRoom");
        return;
    } else  {
        console.log("Someone Joined Room");

        createPeerConnection(sockedId);
        sendMessage({
            type: "handShake"
        },sockedId);
    }
});

document.getElementById('create').addEventListener('click',function () {
    creating = true;
    getLocalMedia();
    this.disabled = true;
});


function doAnswer(peerConnection, socketID) {
    console.log("sending answer to peer");
    peerConnection.createAnswer()
        .then(function (sessionDescription) {
            peerConnection.setLocalDescription(sessionDescription);
            console.log('setLocalAndSendMessage sending message', sessionDescription);
            sendMessage(sessionDescription, socketID);
        },onCreateSessionDescriptionError );
}


function onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
}

function gotLocalMediaStream(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
    if(joining) {
        socket.emit("joinRoom", joining);
        return;
    }
    if(creating) {
        const roomName = document.getElementById('roomName').value;
        socket.emit("createRoom", roomName);
        return;
    }
}

function sendMessage(message, socketID) {
    console.log("sending message", message, socketID);
    socket.emit('message', message, socketID);
}

function sendOffer(peerConnection , socketID) {
    peerConnection.createOffer(function (sessionDescription) {
        peerConnection.setLocalDescription(sessionDescription);
        console.log('setLocalAndSendMessage sending message', sessionDescription);
        sendMessage(sessionDescription,socketID);
    }, handleCreateOfferError);
}



function createPeerConnection(sockedId) {
    const id = sockedId.split("#")[1];
    try{
        peers[sockedId] = new RTCPeerConnection(servers);
        let peerConnection = peers[sockedId];
        peerConnection.onicecandidate = function (event) {
            console.log("iceCandidate :" , event);
            if(event.candidate) {
                sendMessage({
                    type: 'candidate',
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                }, sockedId);
            } else {
                console.log('End of candidates.');
            }
        };
        peerConnection.onaddstream = function (event) {
            $("#videos").append(`<video id="${id}"  autoplay playsinline></video>`);
            let remoteVideo =  document.getElementById(id);
            let remoteStream = event.stream;
            remoteVideo.srcObject = remoteStream;
        };
        peerConnection.onremovestream = function (event) {
            document.getElementById("#"+id).remove();
        };
        peerConnection.addStream(localStream);
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
    }
}


function handleCreateOfferError(event) {
    console.log('createOffer() error: ', event);
}




function handleLocalMediaStreamError(error) {
    console.log('navigator.getUserMedia error: ', error);
}


function getLocalMedia() {
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream)
        .catch(handleLocalMediaStreamError);
}


function handleRoomUserChange(roomName, value) {
    const selector = "#"+roomName+">p>span";
    console.log(selector);
    var users = parseInt($(selector).text());
    if(users+value == 0) {
        $("#"+roomName).remove();
        console.log(roomName + "removed");
    }
    else{
        $(selector).html(users+value);
    }
}

function join(roomName) {
    console.log("joining " + roomName);
    joining = roomName;
    //socket.emit("joinRoom", roomName);
    getLocalMedia();
}

document.getElementById("screenShare").disabled = true;
document.getElementById("screenShare").onclick = addScreenShare;
function addScreenShare() {
    // $("#screenShare").enable(true);
    var displayMediaStreamConstraints = {
        video: true // or pass HINTS
    };

    if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia(displayMediaStreamConstraints).then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    } else {
        navigator.getDisplayMedia(displayMediaStreamConstraints).then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    }
}

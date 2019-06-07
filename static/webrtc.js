var socket = io();
var peerConnection;
let myName;
var answer;

let initiator;

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
    }]
};

const localVideo = document.getElementById('localVideo');
console.log(localVideo);
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let remoteStream;

function gotLocalMediaStream(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
    if(initiator) maybeStart();
    else {
        socket.emit('recieved',answer);
    }
}

function handleLocalMediaStreamError(error) {
    console.log('navigator.getUserMedia error: ', error);
}


function getLocalMedia() {
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream)
        .catch(handleLocalMediaStreamError);
}


var createButton = document.getElementById('create');
createButton.addEventListener('click', function () {
    myName = document.getElementById("roomName").value;
    socket.emit('create', myName);
    createButton.disabled = true;
});

socket.on('newconnection', function (users) {
    for(var userName in users) {
        $("#userList").append('<li id="'+userName+'" > <p style="display: inline-block">'+userName +'</p> <button style="display: inline-block" onclick=startCall("'+userName+'")> call  </button></li>');
    }
});

socket.on("newUser", function (userName) {
    $("#userList").append('<li id="'+userName+'" ><p style="display: inline-block">'+userName +'</p>  <button style="display: inline-block" onclick=startCall("'+userName+'")> call </button> </li>');
});

socket.on("userDisconnected", function (userName) {
    $("#"+userName).remove();
});

socket.on("recievedCall", function (userName) {
    //todo-> answer or reject?
    answer = window.confirm(userName + " is calling you");
    console.log(answer);
    if(answer) getLocalMedia();
});

socket.on("answer", function (hasAnswered) {
    if(hasAnswered) {
        getLocalMedia();
    }
    else {
        alert("Call rejected");
    }
});



socket.on('message', function (message) {
    console.log("Client Recieved A message", message) ;
    switch(message.type) {
        case 'offer' :
            if(!initiator) {
               maybeStart();
            }
            peerConnection.setRemoteDescription(new RTCSessionDescription(message));
            doAnswer();
            break;
        case 'answer':
            peerConnection.setRemoteDescription(new RTCSessionDescription(message));
            break;
        case 'candidate' :
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: message.label,
                candidate: message.candidate
            });
            peerConnection.addIceCandidate(candidate);
            break;
        default:
            console.log("unwanted message", message);
            break;
    }

});


function doAnswer() {
    console.log("sending answer to peer");
    peerConnection.createAnswer()
        .then(setLocalAndSendMessage,onCreateSessionDescriptionError );
}

function onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
}

function answerCall(answer) {
    socket.emit('recieved',answer);
}

function sendMessage(message) {
    console.log("sending message", message);
    socket.emit('message', message);
}

const handleIceCandidate = function (event) {
    console.log("iceCandidate :" , event);
    if(event.candidate) {
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        })
    } else {
        console.log('End of candidates.');
    }
};

function handleRemoteStreamAdded(event) {
    console.log("remote stream added");
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}

function createPeerConnection() {
    try {
        peerConnection = new RTCPeerConnection(servers);
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
    }
}


function doCall() {
    console.log("sending offer to peer");
    peerConnection.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function handleCreateOfferError(event) {
    console.log('createOffer() error: ', event);
}

function setLocalAndSendMessage(sessionDescription) {
    peerConnection.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription);
}

function maybeStart() {
    console.log("startting ->>");
    if(typeof localStream !==undefined) {
        createPeerConnection();
        peerConnection.addStream(localStream);
        if(initiator) {
            doCall();
        }
    }
}

function startCall(name) {
    if(name === myName) {
        alert("trying to call yourself? are you DUMBASS?");
        return;
    }
    initiator = true;
    socket.emit('initiateCall', name);
}


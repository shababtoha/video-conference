var socket = io('/call');
var peerConnection;
let myName;
var answer;

let initiator;

const mediaStreamConstraints = {
    video: true,
    audio : true,
};


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
    console.log('myusername created')
    socket.emit('create', myName);
    createButton.disabled = true;
});

socket.on('newconnection', function (users) {
    for(var userName in users) {
        $("#userList").append('<li id="'+userName+'" > <p style="display: inline-block">'+userName +'</p>  <button style="display: inline-block" onclick=startCall("'+userName+'")> call  </button></li>');
    }
});

socket.on("newUser", function (userName) {
    $("#userList").append('<li id="'+userName+'" ><p style="display: inline-block">'+userName +'</p>  <button style="display: inline-block" onclick=startCall("'+userName+'")> call </button> </li>');
});

socket.on("userDisconnected", function (userName) {
    $("#"+userName).remove();
});

socket.on("recievedCall", function (userName) {
    console.log('call recieved from', userName);
    getLocalMedia();
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
            document.getElementById("screenShare").disabled = false;
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
    console.log("Remote stream added");
    if (event.streams && event.streams[0]) {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    }
}


function createPeerConnection() {
    try {
        peerConnection = new RTCPeerConnection(servers);
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.ontrack = handleRemoteStreamAdded; // Modern approach
        console.log('Created RTCPeerConnection');
    } catch (e) {
        console.error('Failed to create PeerConnection:', e.message);
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


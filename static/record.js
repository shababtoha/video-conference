let localVideo = document.getElementById("localVideo");
let localStream = null;
let recorder = null;

$("#startVideo").click(getLocalMedia);
$("#recordVideo").click(startRecord);
$("#stopRecord").click(stopRecord);

const mediaStreamConstraints = {
    video: true,
    audio : true,
};


function getLocalMedia() {
    console.log("hello");
    $("#startVideo").prop('disabled', true);
    $("#recordVideo").prop('disabled', false);
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream)
        .catch(handleLocalMediaStreamError);
}

function handleLocalMediaStreamError(error) {
    console.log('navigator.getUserMedia error: ', error);
}

function gotLocalMediaStream(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
}

function  startRecord() {
    recorder = new RecordRTCPromisesHandler(localStream, {
        type: 'video'
    });
    recorder.startRecording();
}

async function stopRecord() {
    await recorder.stopRecording();
    let blob = await recorder.getBlob();
    var data = new FormData();
    data.append('file', blob);
        console.log(blob);
        $.ajax({
            type : 'POST',
            url : '/video',
            data : data,
            contentType: false,
            processData: false,
            success : function (data) {
                console.log(data);
            }
        });

}
//Recording stuff
let mediaRecorder;
let recordedChunks = [];

function startRecording() {
  recordedChunks = []; // Reset the recorded chunks
  console.log("start recording function triggered")
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    mediaRecorder = new MediaRecorder(stream);
    console.log("audio access activated")

    mediaRecorder.addEventListener("dataavailable", function (event) {
      recordedChunks.push(event.data);
      console.log("recording chunks")
    });

    mediaRecorder.start();
  });
}

function stopRecording() {
  mediaRecorder.stop();
  console.log("stop recording function triggered")
  const audioBlob = new Blob(recordedChunks, { type: "audio/wav" });
  const audioUrl = URL.createObjectURL(audioBlob);

  const audioBlobInput = document.getElementById("audioBlob");
  audioBlobInput.value = audioUrl;
}
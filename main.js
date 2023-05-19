    let mediaRecorder;
    let recordedChunks = [];

    function startRecording() {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
          mediaRecorder = new MediaRecorder(stream);

          mediaRecorder.addEventListener('dataavailable', function (event) {
            recordedChunks.push(event.data);
          });

          mediaRecorder.start();
        });
    }

    function stopRecording() {
      mediaRecorder.stop();
    }

    function saveRecording() {
      const audioBlob = new Blob(recordedChunks, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const anchorElement = document.createElement('a');
      anchorElement.href = audioUrl;
      anchorElement.download = 'recording.wav';
      anchorElement.click();
    }

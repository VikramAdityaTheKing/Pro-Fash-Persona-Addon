// Essential: Import the Adobe Express Add-on SDK
import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

// Wrap all your add-on's logic inside addOnUISdk.ready.then()
// This ensures the SDK is fully loaded and ready before your code tries to use it.
addOnUISdk.ready.then(async () => {
    console.log("Adobe Express Add-on SDK is ready for use!");

    // Get references to HTML elements
    const videoElement = document.getElementById('videoElement');
    const suitOverlayImg = document.getElementById('suitOverlayImg');
    const canvasOutput = document.getElementById('canvasOutput');
    const ctx = canvasOutput.getContext('2d');

    const snapshotCanvas = document.getElementById('snapshotCanvas');
    const snapshotCtx = snapshotCanvas.getContext('2d');

    // UI elements
    const suitSelector = document.getElementById('suitSelector');
    const flipBtn = document.getElementById('flipBtn');
    const scaleSlider = document.getElementById('scaleSlider'); // New slider
    const yOffsetSlider = document.getElementById('yOffsetSlider'); // New slider
    const takeSnapshotBtn = document.getElementById('takeSnapshotBtn');
    const startRecordingBtn = document.getElementById('startRecordingBtn');
    const stopRecordingBtn = document.getElementById('stopRecordingBtn');
    const addMediaToExpressBtn = document.getElementById('addMediaToExpressBtn');
    const startTranscriptionBtn = document.getElementById('startTranscriptionBtn');
    const stopTranscriptionBtn = document.getElementById('stopTranscriptionBtn');
    const transcriptNotes = document.getElementById('transcriptNotes');

    let currentSuitImage = null;
    let isFlipped = false;
    let videoScale = parseFloat(scaleSlider.value); // Initial scale from slider
    let videoYOffset = parseFloat(yOffsetSlider.value); // Initial Y offset from slider
    let recordedChunks = [];
    let mediaRecorder;
    let recognition;
    let isRecording = false;

    // --- Suit Image URLs (USING GITHUB RAW URLs for reliability) ---
    // Ensure these URLs are correct and point to your public GitHub raw files.
    // Replace 'my-final-addon/main/' with 'adobe_express_professional_persona_addon/adobe_virtual_professional_persona_creator/'
    // if you are using that older repo for assets.
    const suitImageUrls = {
        male_sitting: 'https://raw.githubusercontent.com/VikramAdityaTheKing/my-final-addon/main/assets/suits/male_suit_sitting.png',
        male_standing: 'https://raw.githubusercontent.com/VikramAdityaTheKing/my-final-addon/main/assets/suits/male_suit_standing.png',
        female_sitting: 'https://raw.githubusercontent.com/VikramAdityaTheKing/my-final-addon/main/assets/suits/female_suit_sitting.png',
        female_standing: 'https://raw.githubusercontent.com/VikramAdityaTheKing/my-final-addon/main/assets/suits/female_suit_standing.png',
    };

    // --- Core Webcam Access ---
    async function startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoElement.srcObject = stream;
            videoElement.play();
            console.log("Webcam stream started.");

            videoElement.addEventListener('loadedmetadata', () => {
                canvasOutput.width = videoElement.videoWidth;
                canvasOutput.height = videoElement.videoHeight;
                snapshotCanvas.width = videoElement.videoWidth;
                snapshotCanvas.height = videoElement.videoHeight;
                startDrawingLoop();
            });

        } catch (err) {
            console.error("Error accessing webcam: ", err);
            alert("Unable to access webcam. Please ensure it's connected and permissions are granted in manifest.json.");
        }
    }

    // --- Continuous Drawing Loop (Compositing) ---
    function startDrawingLoop() {
        function drawFrame() {
            ctx.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
            ctx.save();

            if (isFlipped) {
                ctx.translate(canvasOutput.width, 0);
                ctx.scale(-1, 1);
            }

            // --- Drawing Order: Suit first, then Webcam Feed on top ---

            // 1. Draw the professional suit image (background)
            if (currentSuitImage && currentSuitImage.complete) {
                const suitAspect = currentSuitImage.width / currentSuitImage.height;
                const canvasAspect = canvasOutput.width / canvasOutput.height;

                let drawWidth, drawHeight, drawX, drawY;

                if (suitAspect > canvasAspect) {
                    drawHeight = canvasOutput.height;
                    drawWidth = drawHeight * suitAspect;
                    drawX = (canvasOutput.width - drawWidth) / 2;
                    drawY = 0;
                } else {
                    drawWidth = canvasOutput.width;
                    drawHeight = drawWidth / suitAspect;
                    drawX = 0;
                    drawY = (canvasOutput.height - drawHeight) / 2;
                }
                ctx.drawImage(currentSuitImage, drawX, drawY, drawWidth, drawHeight);

            } else {
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvasOutput.width, canvasOutput.height);
            }

            // 2. Draw the live webcam feed (foreground) with scale and offset
            const videoDrawWidth = videoElement.videoWidth * videoScale;
            const videoDrawHeight = videoElement.videoHeight * videoScale;
            const videoDrawX = (canvasOutput.width - videoDrawWidth) / 2; // Center horizontally
            const videoDrawY = (canvasOutput.height - videoDrawHeight) / 2 + videoYOffset; // Center vertically + offset

            ctx.drawImage(videoElement, videoDrawX, videoDrawY, videoDrawWidth, videoDrawHeight);

            ctx.restore();
            requestAnimationFrame(drawFrame);
        }
        requestAnimationFrame(drawFrame);
    }

    // --- UI Control Logic ---

    // Suit Selector
    suitSelector.addEventListener('change', (event) => {
        const selectedSuitKey = event.target.value;
        if (selectedSuitKey && suitImageUrls[selectedSuitKey]) {
            const img = new Image();
            img.crossOrigin = "anonymous"; // Essential for images from other domains to be drawn on canvas
            img.src = suitImageUrls[selectedSuitKey];
            img.onload = () => {
                currentSuitImage = img;
                console.log("Selected suit loaded:", selectedSuitKey);
            };
            img.onerror = (e) => {
                console.error("Failed to load suit image:", suitImageUrls[selectedSuitKey], e);
                alert("Failed to load suit image. Check console for Network errors.");
            };
        } else {
            currentSuitImage = null;
            console.log("No suit selected.");
        }
    });

    // Flip Button
    flipBtn.addEventListener('click', () => {
        isFlipped = !isFlipped;
        console.log("Display flipped:", isFlipped);
    });

    // Scale Slider
    scaleSlider.addEventListener('input', (event) => {
        videoScale = parseFloat(event.target.value);
        console.log("Video scale:", videoScale);
    });

    // Y Offset Slider
    yOffsetSlider.addEventListener('input', (event) => {
        videoYOffset = parseFloat(event.target.value);
        console.log("Video Y Offset:", videoYOffset);
    });


    // --- Snapshot Functionality ---
    takeSnapshotBtn.addEventListener('click', () => {
        if (!videoElement.srcObject || !currentSuitImage) {
            alert("Webcam not active or no suit selected. Cannot take snapshot.");
            return;
        }

        snapshotCtx.clearRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
        snapshotCtx.drawImage(canvasOutput, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

        const imageDataUrl = snapshotCanvas.toDataURL('image/png');
        console.log("Snapshot taken. Image data URL size:", imageDataUrl.length);

        window.lastSnapshotDataUrl = imageDataUrl;
        alert("Snapshot taken! Ready to add to Express.");
        addMediaToExpressBtn.disabled = false;
    });


    // --- Video Recording Functionality ---
    startRecordingBtn.addEventListener('click', () => {
        if (!videoElement.srcObject) {
            alert("Webcam not active for recording.");
            return;
        }
        isRecording = true;
        recordedChunks = [];
        const combinedStream = new MediaStream([
            canvasOutput.captureStream().getVideoTracks()[0],
            videoElement.srcObject.getAudioTracks()[0]
        ]);

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            isRecording = false;
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            console.log("Recording stopped. Blob size:", blob.size);
            window.lastRecordedVideoBlob = blob;
            alert("Video recorded! Ready to add to Express.");
            startRecordingBtn.disabled = false;
            stopRecordingBtn.disabled = true;
            addMediaToExpressBtn.disabled = false;
            // Stop transcription if it was started simultaneously
            if (recognition && recognition.continuous && recognition.state !== 'inactive') {
                recognition.stop();
                startTranscriptionBtn.disabled = false;
                stopTranscriptionBtn.disabled = true;
            }
        };

        mediaRecorder.start();
        console.log("Recording started.");
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = false;
        addMediaToExpressBtn.disabled = true;

        // --- Start Voice Notes simultaneously with recording ---
        if (recognition && recognition.state !== 'listening') { // Only start if not already listening
            transcriptNotes.value = '';
            recognition.start();
            console.log("Speech recognition started simultaneously.");
            startTranscriptionBtn.disabled = true;
            stopTranscriptionBtn.disabled = false;
        }
    });

    stopRecordingBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            console.log("Recording stopping...");
        }
    });

    // --- Web Speech API (Voice Transcription) Functionality ---
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.addEventListener('result', (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            transcriptNotes.value = finalTranscript + interimTranscript;
        });

        recognition.addEventListener('error', (event) => {
            console.error('Speech recognition error:', event.error);
            transcriptNotes.value += "\n(Speech recognition error. Please try again.)";
            // Re-enable buttons if transcription stops on error and not recording video
            if (!isRecording) {
                startTranscriptionBtn.disabled = false;
                stopTranscriptionBtn.disabled = true;
            }
        });

        // Manual Start/Stop for Voice Notes (separate from video recording)
        startTranscriptionBtn.addEventListener('click', () => {
            transcriptNotes.value = '';
            recognition.start();
            console.log("Speech recognition started manually.");
            startTranscriptionBtn.disabled = true;
            stopTranscriptionBtn.disabled = false;
        });

        stopTranscriptionBtn.addEventListener('click', () => {
            recognition.stop();
            console.log("Speech recognition stopped manually.");
            startTranscriptionBtn.disabled = false;
            stopTranscriptionBtn.disabled = true;
        });
    } else {
        transcriptNotes.value = "Speech Recognition API not supported in this browser.";
        startTranscriptionBtn.disabled = true;
        stopTranscriptionBtn.disabled = true;
    }

    // --- Add Media to Express Functionality ---
    addMediaToExpressBtn.addEventListener('click', async () => {
        try {
            // Access SDK objects from addOnUISdk.instance (this is the standard path in SDK)
            const { document, asset } = addOnUISdk.instance;

            // Add Snapshot Image
            if (window.lastSnapshotDataUrl) {
                const snapshotBlob = await (await fetch(window.lastSnapshotDataUrl)).blob();
                const snapshotAssetRef = await asset.createFromBlob(snapshotBlob, { type: 'image/png' });
                const newImageElement = await document.addImage(snapshotAssetRef);
                console.log("Snapshot image added to Express:", newImageElement);
                alert("Snapshot image added to Express!");
            } else {
                alert("No snapshot taken yet!");
            }

            // Add Recorded Video
            if (window.lastRecordedVideoBlob) {
                const videoAssetRef = await asset.createFromBlob(window.lastRecordedVideoBlob, { type: 'video/webm' });
                const newVideoElement = await document.addVideo(videoAssetRef);
                console.log("Recorded video added to Express:", newVideoElement);
                alert("Recorded video added to Express!");
            } else {
                alert("No video recorded yet!");
            }

        } catch (error) {
            console.error("Error adding media to Express:", error);
            alert("Failed to add media to Express. Check console for details. (Likely SDK access issue or asset creation issue)");
        }
    });

    startWebcam(); // Start the webcam initially
}); // Close of addOnUISdk.ready.then() wrapper

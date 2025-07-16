// Essential: Import the Adobe Express Add-on SDK
import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

// Wrap all your add-on's logic inside addOnUISdk.ready.then()
// This ensures the SDK is fully loaded and ready before your code tries to use it.
addOnUISdk.ready.then(async () => {
    console.log("Adobe Express Add-on SDK is ready for use!");

    // Get references to HTML elements (these should be available in your index.html)
    const videoElement = document.getElementById('videoElement');
    const suitOverlayImg = document.getElementById('suitOverlayImg');
    const canvasOutput = document.getElementById('canvasOutput');
    const ctx = canvasOutput.getContext('2d');

    const snapshotCanvas = document.getElementById('snapshotCanvas');
    const snapshotCtx = snapshotCanvas.getContext('2d');

    // UI elements
    const suitSelector = document.getElementById('suitSelector');
    const flipBtn = document.getElementById('flipBtn');
    const takeSnapshotBtn = document.getElementById('takeSnapshotBtn');
    const startRecordingBtn = document.getElementById('startRecordingBtn');
    const stopRecordingBtn = document.getElementById('stopRecordingBtn');
    const addMediaToExpressBtn = document.getElementById('addMediaToExpressBtn');
    const startTranscriptionBtn = document.getElementById('startTranscriptionBtn');
    const stopTranscriptionBtn = document.getElementById('stopTranscriptionBtn');
    const transcriptNotes = document.getElementById('transcriptNotes');

    let currentSuitImage = null; // To hold the loaded Image object of the suit
    let isFlipped = false;       // State for horizontal flip of video/suit
    let recordedChunks = [];     // For MediaRecorder
    let mediaRecorder;
    let recognition;             // For Web Speech API (declared here to be accessible throughout)

    // --- Suit Image URLs (Using LOCAL RELATIVE PATHS) ---
    // These paths point to the 'assets/suits' folder within your local project.
    // Ensure your transparent PNGs are correctly placed there!
    const suitImageUrls = {
        male_sitting: 'assets/suits/male_suit_sitting.png',
        male_standing: 'assets/suits/male_suit_standing.png',
        female_sitting: 'assets/suits/female_suit_sitting.png',
        female_standing: 'assets/suits/female_suit_standing.png',
    };

    // --- Core Webcam Access ---
    async function startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); // Request audio too
            videoElement.srcObject = stream;
            videoElement.play();
            console.log("Webcam stream started.");

            // Set canvas sizes matching video dimensions once video metadata is loaded
            videoElement.addEventListener('loadedmetadata', () => {
                canvasOutput.width = videoElement.videoWidth;
                canvasOutput.height = videoElement.videoHeight;
                snapshotCanvas.width = videoElement.videoWidth;
                snapshotCanvas.height = videoElement.videoHeight;
                startDrawingLoop(); // Start the continuous drawing loop
            });

        } catch (err) {
            console.error("Error accessing webcam: ", err);
            alert("Unable to access webcam. Please ensure it's connected and permissions are granted.");
        }
    }

    // --- Continuous Drawing Loop (Compositing) ---
    function startDrawingLoop() {
        function drawFrame() {
            ctx.clearRect(0, 0, canvasOutput.width, canvasOutput.height); // Always clear the canvas before drawing a new frame
            ctx.save(); // Save context state before any transformations

            // Apply global flip if needed
            if (isFlipped) {
                ctx.translate(canvasOutput.width, 0);
                ctx.scale(-1, 1);
            }

            // --- Drawing Order: Suit first, then Webcam Feed on top ---

            // 1. Draw the professional suit image (background)
            if (currentSuitImage && currentSuitImage.complete) {
                // Draw suit to fill the canvas, maintaining aspect ratio.
                const suitAspect = currentSuitImage.width / currentSuitImage.height;
                const canvasAspect = canvasOutput.width / canvasOutput.height;

                let drawWidth, drawHeight, drawX, drawY;

                // Fit suit to canvas (cover or contain based on preference)
                if (suitAspect > canvasAspect) { // Suit is wider than canvas
                    drawHeight = canvasOutput.height;
                    drawWidth = drawHeight * suitAspect;
                    drawX = (canvasOutput.width - drawWidth) / 2; // Center horizontally
                    drawY = 0;
                } else { // Suit is taller than canvas
                    drawWidth = canvasOutput.width;
                    drawHeight = drawWidth / suitAspect;
                    drawX = 0;
                    drawY = (canvasOutput.height - drawHeight) / 2; // Center vertically
                }
                ctx.drawImage(currentSuitImage, drawX, drawY, drawWidth, drawHeight);

            } else {
                // If no suit selected, draw a neutral background
                ctx.fillStyle = '#f0f0f0'; // Light grey
                ctx.fillRect(0, 0, canvasOutput.width, canvasOutput.height);
            }

            // 2. Draw the live webcam feed (foreground)
            // User will manually align their face by physically moving to fit the suit opening.
            ctx.drawImage(videoElement, 0, 0, canvasOutput.width, canvasOutput.height);

            ctx.restore(); // Restore context state (important for flip and other transformations)
            requestAnimationFrame(drawFrame); // Continue the loop
        }
        requestAnimationFrame(drawFrame); // Start the loop
    }

    // --- UI Control Logic ---

    // Suit Selector
    suitSelector.addEventListener('change', (event) => {
        const selectedSuitKey = event.target.value;
        if (selectedSuitKey && suitImageUrls[selectedSuitKey]) {
            const img = new Image();
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
    });


    // --- Video Recording Functionality ---
    startRecordingBtn.addEventListener('click', () => {
        if (!videoElement.srcObject) {
            alert("Webcam not active for recording.");
            return;
        }
        recordedChunks = [];
        const combinedStream = new MediaStream([
            canvasOutput.captureStream().getVideoTracks()[0], // Captures the composite video
            videoElement.srcObject.getAudioTracks()[0]       // Original audio from webcam
        ]);

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            console.log("Recording stopped. Blob size:", blob.size);
            window.lastRecordedVideoBlob = blob;
            alert("Video recorded! Ready to add to Express.");
            startRecordingBtn.disabled = false;
            stopRecordingBtn.disabled = true;
            addMediaToExpressBtn.disabled = false;
        };

        mediaRecorder.start();
        console.log("Recording started.");
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = false;
        addMediaToExpressBtn.disabled = true;
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
            startTranscriptionBtn.disabled = false;
            stopTranscriptionBtn.disabled = true;
        });

        // Start/Stop for Voice Notes (will be called automatically with recording too)
        startTranscriptionBtn.addEventListener('click', () => {
            transcriptNotes.value = '';
            recognition.start();
            console.log("Speech recognition started.");
            startTranscriptionBtn.disabled = true;
            stopTranscriptionBtn.disabled = false;
        });

        stopTranscriptionBtn.addEventListener('click', () => {
            recognition.stop();
            console.log("Speech recognition stopped.");
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
            // Access SDK objects from window.addonsdk.app
            const { document, asset } = addOnUISdk.instance.document;

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

    // --- Initial setup calls ---
    startWebcam(); // Start the webcam initially
}); // Close of addOnUISdk.ready.then() wrapper

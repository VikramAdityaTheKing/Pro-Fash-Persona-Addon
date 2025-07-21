// Essential: Import the Adobe Express Add-on SDK
import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

const isNullOrWhiteSpace = (value) => !value || value.trim().length === 0;
const isImage = (fileName) => (
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".bmp") ||
    fileName.endsWith(".webp")
);


class OAuthUtils {
    constructor() { console.warn("Dropbox integration removed. OAuthUtils is a placeholder."); }
    async generateChallenge() { return { codeChallenge: "", codeVerifier: "" }; }
    async generateAccessToken() { return { accessToken: "" }; }
    async getAccessToken() { return null; }
    async saveTokenResponse() { return { accessToken: "" }; }
}

// Wrap all your add-on's logic inside addOnUISdk.ready.then()
addOnUISdk.ready.then(async () => {
    console.log("Adobe Express Add-on SDK is ready for use!");

    // Get references to HTML elements
    const videoElement = document.getElementById('videoElement');
    const canvasOutput = document.getElementById('canvasOutput');
    const ctx = canvasOutput.getContext('2d');

    const snapshotCanvas = document.getElementById('snapshotCanvas');
    const snapshotCtx = snapshotCanvas.getContext('2d');
    const mediaGallery = document.getElementById('mediaGallery');

    // UI elements
    const suitSelector = document.getElementById('suitSelector');
    const flipBtn = document.getElementById('flipBtn');
    const takeSnapshotBtn = document.getElementById('takeSnapshotBtn');
    const startRecordingBtn = document.getElementById('startRecordingBtn');
    const stopRecordingBtn = document.getElementById('stopRecordingBtn');
    const clearRecordingBtn = document.getElementById('clearRecordingBtn');
    const downloadAllLocalBtn = document.getElementById('downloadAllLocalBtn'); // New button
    const statusMessage = document.getElementById('statusMessage');
    const transcriptNotes = document.getElementById('transcriptNotes');
    const dragInfo = document.getElementById('dragInfo'); // New drag info element

    // Sliders
    const srcXSlider = document.getElementById('srcX');
    const srcYSlider = document.getElementById('srcY');
    const srcWSlider = document.getElementById('srcW');
    const srcHSlider = document.getElementById('srcH');
    const destXSlider = document.getElementById('destX');
    const destYSlider = document.getElementById('destY');
    const faceOvalScaleSlider = document.getElementById('faceOvalScale');
    const suitScaleSlider = document.getElementById('suitScaleSlider');
    const suitXOffsetSlider = document.getElementById('suitXOffsetSlider');
    const suitYOffsetSlider = document.getElementById('suitYOffsetSlider');

    let currentSuitImage = null;
    let isFlipped = false;
    let recordedChunks = [];
    let mediaRecorder;
    let recognition;
    let isRecording = false;
    let finalTranscriptionAccumulated = "";
    let mediaItems = [];


    // --- Face Frame Variables ---
    let srcX = parseFloat(srcXSlider.value);
    let srcY = parseFloat(srcYSlider.value);
    let srcW = parseFloat(srcWSlider.value);
    let srcH = parseFloat(srcHSlider.value);

    // --- Face (Destination on Canvas) Variables ---
    let destX = parseFloat(destXSlider.value);
    let destY = parseFloat(destYSlider.value);
    let baseDestW = 300;
    let baseDestH = 400;
    let faceOvalScale = parseFloat(faceOvalScaleSlider.value);

    // --- Suit Drawing Adjustments ---
    let suitScale = parseFloat(suitScaleSlider.value);
    let suitXOffset = parseFloat(suitXOffsetSlider.value);
    let suitYOffset = parseFloat(suitYOffsetSlider.value);


    // --- Suit Image URLs ---
    const suitImageUrls = {
        male_sitting: 'https://raw.githubusercontent.com/VikramAdityaTheKing/my-final-addon/main/assets/suits/male_suit_sitting.png',
        male_standing: 'https://raw.githubusercontent.com/VikramAdityaTheKing/my-final-addon/main/assets/suits/male_suit_standing.png',
        female_sitting: 'https://raw.githubusercontent.com/VikramAdityaTheKing/my-final-addon/main/assets/suits/female_suit_sitting.png',
        female_standing: 'https://raw.githubusercontent.com/VikramAdityaTheKing/my-final-addon/main/assets/suits/female_suit_standing.png',
    };

    // --- Core Webcam Access ---
    async function startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }); // Request 720p ideal
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
            statusMessage.textContent = "Error: Cannot access webcam. Check browser/manifest permissions.";
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

            // --- Drawing Order: Suit first (background), then Framed Webcam Feed (Oval) on top ---

            // 1. Draw the professional suit image (background)
            if (currentSuitImage && currentSuitImage.complete) {
                const suitDrawWidth = currentSuitImage.width * suitScale;
                const suitDrawHeight = currentSuitImage.height * suitScale;
                const suitDrawX = (canvasOutput.width - suitDrawWidth) / 2 + suitXOffset;
                const suitDrawY = (canvasOutput.height - suitDrawHeight) / 2 + suitYOffset;

                ctx.drawImage(currentSuitImage, suitDrawX, suitDrawY, suitDrawWidth, suitDrawHeight);
            } else {
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvasOutput.width, canvasOutput.height);
            }

            // 2. Draw the live webcam feed (foreground) - Cropped and Oval Shaped
            const videoSourceX = (srcX / 100) * videoElement.videoWidth;
            const videoSourceY = (srcY / 100) * videoElement.videoHeight;
            const videoSourceWidth = (srcW / 100) * videoElement.videoWidth;
            const videoSourceHeight = (srcH / 100) * videoElement.videoHeight;

            const currentDestW = baseDestW * faceOvalScale;
            const currentDestH = baseDestH * faceOvalScale;
            const ellipseX = destX + currentDestW / 2;
            const ellipseY = destY + currentDestH / 2;

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(ellipseX, ellipseY, currentDestW / 2, currentDestH / 2, 0, 0, 2 * Math.PI);
            ctx.clip();

            ctx.drawImage(
                videoElement,
                videoSourceX,
                videoSourceY,
                videoSourceWidth,
                videoSourceHeight,
                destX,
                destY,
                currentDestW,
                currentDestH
            );
            ctx.restore();

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
            img.crossOrigin = "anonymous";
            img.src = suitImageUrls[selectedSuitKey];
            img.onload = () => {
                currentSuitImage = img;
                console.log("Selected suit loaded:", selectedSuitKey);
            };
            img.onerror = (e) => {
                console.error("Failed to load suit image:", suitImageUrls[selectedSuitKey], e);
                statusMessage.textContent = `Error loading suit: ${e.message || 'Unknown'}`;
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

    // Face Frame (Source Crop) Sliders
    srcXSlider.addEventListener('input', (event) => { srcX = parseFloat(event.target.value); });
    srcYSlider.addEventListener('input', (event) => { srcY = parseFloat(event.target.value); });
    srcWSlider.addEventListener('input', (event) => { srcW = parseFloat(event.target.value); });
    srcHSlider.addEventListener('input', (event) => { srcH = parseFloat(event.target.value); });

    // Face (Destination on Canvas) Sliders
    destXSlider.addEventListener('input', (event) => { destX = parseFloat(event.target.value); });
    destYSlider.addEventListener('input', (event) => { destY = parseFloat(event.target.value); });
    faceOvalScaleSlider.addEventListener('input', (event) => { faceOvalScale = parseFloat(event.target.value); });

    // Suit Adjustment Sliders
    suitScaleSlider.addEventListener('input', (event) => { suitScale = parseFloat(event.target.value); });
    suitXOffsetSlider.addEventListener('input', (event) => { suitXOffset = parseFloat(event.target.value); });
    suitYOffsetSlider.addEventListener('input', (event) => { suitYOffset = parseFloat(event.target.value); });


    // --- Snapshot Functionality ---
    takeSnapshotBtn.addEventListener('click', () => {
        if (!videoElement.srcObject || !currentSuitImage) {
            statusMessage.textContent = "Error: Webcam not active or no suit selected.";
            return;
        }
        if (mediaItems.length >= 3) {
            statusMessage.textContent = "Gallery full (max 3 items). Clear existing or delete.";
            return;
        }

        statusMessage.textContent = "Taking snapshot...";
        snapshotCtx.clearRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
        snapshotCtx.drawImage(canvasOutput, 0, 0, snapshotCanvas.width, canvasOutput.height);

        const imageDataUrl = snapshotCanvas.toDataURL('image/png');
        console.log("Snapshot taken. Image data URL size:", imageDataUrl.length);

        const newItem = { type: 'image', url: imageDataUrl, blob: null, name: `persona_snapshot_${Date.now()}.png` };
        addMediaItemToGallery(newItem);
        statusMessage.textContent = "Snapshot added to gallery. Drag image to canvas.";
    });


    // --- Video Recording Functionality ---
    startRecordingBtn.addEventListener('click', () => {
        if (!videoElement.srcObject) {
            statusMessage.textContent = "Error: Webcam not active for recording.";
            return;
        }
        if (mediaItems.length >= 3) {
            statusMessage.textContent = "Gallery full (max 3 items). Clear existing or delete.";
            return;
        }

        isRecording = true;
        recordedChunks = [];
        const combinedStream = new MediaStream([
            canvasOutput.captureStream().getVideoTracks()[0],
            videoElement.srcObject.getAudioTracks()[0]
        ]);

        let mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'; // Prefer H.264 MP4
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm; codecs="vp8, opus"'; // Fallback to WebM VP8
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                 mimeType = 'video/webm'; // Fallback to generic WebM
                 if (!MediaRecorder.isTypeSupported(mimeType)) {
                     statusMessage.textContent = "Error: No supported video recording format.";
                     console.error("No supported video recording format found for MediaRecorder.");
                     isRecording = false;
                     return;
                 }
            }
        }
        console.log("Using video mimeType for recording:", mimeType);

        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: mimeType, videoBitsPerSecond: 3000000 });

        mediaRecorder.ondataavailable = (event) => {
            recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            isRecording = false;
            const blob = new Blob(recordedChunks, { type: mimeType });
            console.log("Recording stopped. Blob size:", blob.size);
            
            const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const newItem = { type: 'video', url: URL.createObjectURL(blob), blob: blob, name: `persona_video_${Date.now()}.${fileExtension}` };
            addMediaItemToGallery(newItem);

            statusMessage.textContent = "Video recorded. Added to gallery. Video drag/add is not supported. Please download.";
            startRecordingBtn.disabled = false;
            stopRecordingBtn.disabled = true;
            updateGalleryControls();
            if (recognition && recognition.continuous && recognition.state !== 'inactive') {
                recognition.stop();
            }
        };

        mediaRecorder.start();
        console.log("Recording started.");
        statusMessage.textContent = "Recording... (No time limit)";
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = false;
        updateGalleryControls();

        if (recognition && recognition.state !== 'listening') {
            finalTranscriptionAccumulated = "";
            transcriptNotes.value = '';
            recognition.start();
            console.log("Speech recognition started simultaneously.");
        }
    });

    stopRecordingBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            console.log("Recording stopping...");
        }
    });

    // --- Clear Recording Button ---
    clearRecordingBtn.addEventListener('click', () => {
        mediaItems = [];
        renderGallery();
        statusMessage.textContent = "All recorded media cleared.";
        updateGalleryControls();
    });


    // --- Media Gallery Management ---
    function addMediaItemToGallery(item) {
        mediaItems.push(item);
        renderGallery();
        updateGalleryControls();
    }

    function removeMediaItemFromGallery(index) {
        if (mediaItems[index].url) {
            URL.revokeObjectURL(mediaItems[index].url);
        }
        mediaItems.splice(index, 1);
        renderGallery();
        updateGalleryControls();
    }

    function renderGallery() {
        mediaGallery.innerHTML = '';
        mediaItems.forEach((item, index) => {
            const galleryItemDiv = document.createElement('div');
            galleryItemDiv.className = 'gallery-item';

            let mediaElement;
            if (item.type === 'image') {
                mediaElement = document.createElement('img');
                mediaElement.src = item.url;
            } else if (item.type === 'video') {
                mediaElement = document.createElement('video');
                mediaElement.src = item.url;
                mediaElement.controls = true;
                mediaElement.muted = true;
                mediaElement.loop = true;
                mediaElement.onloadedmetadata = () => {
                    if (mediaElement.duration && mediaElement.duration > 3 * 60) {
                        console.warn(`Video is longer than 3 minutes (${mediaElement.duration.toFixed(0)}s). Max 3 min recommended.`);
                    }
                };
            }
            if (mediaElement) {
                galleryItemDiv.appendChild(mediaElement);
                // Enable drag-and-drop for the media element within the add-on's iframe
                // This allows dragging OUT of the add-on. Video drag will likely FAIL for Express canvas.
                // We only enable drag for images as confirmed working.
                if (item.type === 'image') {
                    addOnUISdk.app.enableDragToDocument(mediaElement, {
                        previewCallback: (el) => {
                            return new URL(el.src);
                        },
                        completionCallback: async (el) => {
                            return [{ blob: item.blob || await fetch(item.url).then(r => r.blob()) }];
                        }
                    });
                }
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'X';
            deleteBtn.onclick = () => removeMediaItemFromGallery(index);
            galleryItemDiv.appendChild(deleteBtn);

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.textContent = 'Download';
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = item.url;
                a.download = item.name;
                document.body.appendChild(a);
                a.click();
                // Add small delay to ensure download initiates before revoking URL
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                }, 100);
            };
            galleryItemDiv.appendChild(downloadBtn);

            const infoDiv = document.createElement('div');
            infoDiv.className = 'gallery-info';
            infoDiv.textContent = item.type === 'video' ? `Duration: ${mediaElement.duration ? mediaElement.duration.toFixed(1) + 's' : '...'}` : '';
            galleryItemDiv.appendChild(infoDiv);

            mediaGallery.appendChild(galleryItemDiv);
        });
    }

    function updateGalleryControls() {
        if (mediaItems.length >= 3) {
            startRecordingBtn.disabled = true;
            takeSnapshotBtn.disabled = true;
            statusMessage.textContent = "Gallery full (max 3 items). Delete to add more.";
        } else {
            startRecordingBtn.disabled = false;
            takeSnapshotBtn.disabled = false;
            if (!isRecording) {
                 statusMessage.textContent = "";
            }
        }
        clearRecordingBtn.disabled = mediaItems.length === 0;
        downloadAllLocalBtn.disabled = mediaItems.length === 0;
        downloadAllLocalBtn.style.display = (mediaItems.length > 0) ? 'block' : 'none'; // Show/hide based on content
    }


    // --- Web Speech API (Voice Transcription) Functionality ---
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.addEventListener('result', (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscriptionAccumulated += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            transcriptNotes.value = finalTranscriptionAccumulated + interimTranscript;
        });

        recognition.addEventListener('error', (event) => {
            console.error('Speech recognition error:', event.error);
            statusMessage.textContent = `Speech error: ${event.error.message || 'Unknown'}`;
            transcriptNotes.value += "\n(Speech recognition error. Please try again.)";
        });
    } else {
        transcriptNotes.value = "Speech Recognition API not supported in this browser.";
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = true;
        clearRecordingBtn.disabled = true;
        downloadAllLocalBtn.disabled = true;
    }

    // --- Initial setup calls ---
    startWebcam();
    updateGalleryControls();
}); 
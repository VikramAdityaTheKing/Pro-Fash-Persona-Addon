**Pro-Fash Persona Addon**

**Professional Persona Creator add-on for Adobe Express**

This Adobe Express Add-on allows users to create professional persona images and videos by overlaying their webcam feed onto pre-designed suit templates, with options for real-time adjustments and voice transcription.

**Features**

Webcam Integration: Live camera feed displayed on canvas.

Professional Suit Overlays: Select from various male/female, sitting/standing suit PNGs to overlay onto your persona.

Real-time Adjustments: Fine-tune the position and scale of your face (oval crop) and the suit overlay to achieve a perfect fit.

Display Flip: Flip your webcam display horizontally for easier posing.

Snapshot Capture: Take high-quality PNG snapshots of your composite persona.

Video Recording: Record short videos of your persona, including audio.

Voice Transcription: Simultaneously record voice notes which are transcribed in real-time.

Media Gallery: Manage captured snapshots and recordings within the add-on, with options to download.

Drag-and-Drop to Express: Directly drag captured image snapshots from the add-on's gallery onto your Adobe Express canvas. (Note: Direct video drag-and-drop to Express is not fully supported; videos are best downloaded and then uploaded manually.)

**Getting Started**

Follow these instructions to set up and run the Pro-Fash Persona Addon in Adobe Express.

Prerequisites

**Node.js (LTS version recommended) and npm (Node Package Manager) installed.**

**Git installed.**

**An Adobe Express account.**

**Google Chrome browser (recommended for full Web Speech API support).**

**Installation & Local Setup**

Clone the Repository:
Open your terminal or command prompt and clone this repository:

Bash

git clone https://github.com/VikramAdityaTheKing/Pro-Fash-Persona-Addon.git
Navigate to the Project Directory:

Bash

cd Pro-Fash-Persona-Addon

Install Dependencies:
Install the necessary Node.js packages, including the Adobe Express Add-on SDK development tools:

Bash

npm install

Build the Add-on:
Build the project for local development. This will create a dist/ folder containing your add-on files.

Bash

npm run build

If the build is successful, you should see messages indicating cleaning and building are done.

Loading the Add-on in Adobe Express (Developer Mode)
Open Adobe Express:
Go to new.express.adobe.com in your Chrome browser.

**Enable Developer Mode:**

In Adobe Express, click on "Add-ons" in the left sidebar.

Scroll down to the bottom of the Add-ons panel and click on "Developer Mode."

Click on "Manage Add-ons."

Toggle the "Developer mode" switch to ON.

Load the Add-on:

In the "Manage Add-ons" panel, click "Load from manifest.json".

A file dialog will open. Navigate to your cloned project directory (Pro-Fash-Persona-Addon/).

Select the manifest.json file located in the root of this directory.

Click "Open".

**Grant Permissions (if prompted):**
Adobe Express will likely ask for permissions (Camera, Microphone, File System access). You must grant these permissions for the add-on to function correctly.

**Access the Add-on:**
Once loaded, you should see "Pro-Fash Persona Addon" listed under "Your add-ons" in the Add-ons panel. Click on it to open the add-on's interface.

**How to Use**
Start Webcam: The add-on should automatically request webcam access upon loading. If not, refresh or check browser permissions.

Select a Suit: Use the "Select Suit" dropdown to choose a professional suit template.

**Adjust Persona:**

Use the "Face Settings (Advanced)" sliders (Src X/Y Pos, Src Width/Height, Dest X/Y Pos, Overall Scale) to perfectly position and size your face within the suit's cutout.

Use the "Suit Settings (Advanced)" sliders (Scale, X/Y Offset) to fine-tune the suit's size and position on the canvas relative to your face.

Use the "Flip Display" button to mirror your webcam feed.

The "Video Scale" and "Video Y Offset" sliders are for general webcam frame adjustments if you need to scale the underlying video before the oval crop is applied.

**Capture Media:**

Click "Take Snapshot" to capture a PNG image of your current persona.

Click "Start Record" to begin recording a video (including audio) of your persona. A transcript will also begin in the "Voice Notes" section.

Click "Stop Record" to end the video recording.

Use "Start Voice Notes" and "Stop Voice Notes" to record transcription independently.

**Manage Gallery & Add to Express:**

Captured snapshots and videos will appear in the "Media Gallery" at the bottom.

Click the "Download" button on any item to save it to your local computer.

For images, you can drag the thumbnail directly from the gallery onto your Adobe Express canvas to add it to your project.

For videos, direct drag-and-drop to Express is not reliably supported by the SDK. It is recommended to download the video locally first, then upload it manually into your Adobe Express project.

Use "Clear All Media" to empty the gallery.

Use "Download All Media Locally" to download all items in the gallery at once.

**Troubleshooting**
"Error: Cannot access webcam...": Ensure your browser has granted camera and microphone permissions to Adobe Express. Check your manifest.json for correct camera and microphone permissions under required Permissions.

Add-on doesn't load/Build fails: Check your terminal for errors after running npm run build. Ensure your manifest.json is perfectly valid JSON and matches the manifestVersion: 2 schema (no extra properties in entryPoints, permissions in requiredPermissions).

Images/Videos not loading: Ensure your GitHub raw content links in index.js are correct (https://raw.githubusercontent.com/USERNAME/REPOSITORY_NAME/BRANCH_NAME/PATH_TO_FILE).

Web Speech API not working (Voice Notes): The Web Speech API is primarily supported in Chrome. Ensure you are using a compatible browser.

# Audiobook Generator using OpenAI TTS and ffmpeg

This Node.js script automates the process of converting long text into an audiobook format using OpenAI's Text-to-Speech (TTS) API and concatenating the resulting audio files using ffmpeg.

## Features

-   Reads input text from a local file (`text.js`).
-   Splits long text into manageable chunks suitable for the OpenAI TTS API limit (4096 characters).
-   Attempts to split text at word boundaries (spaces, periods) to avoid cutting words mid-chunk.
-   Calls the OpenAI TTS API for each chunk to generate an MP3 audio segment.
-   Uses `ffmpeg` to automatically concatenate the generated MP3 segments into a single final audiobook file.
-   Handles API key securely using environment variables (`dotenv`).
-   Provides progress logging during generation and concatenation.
-   Includes basic error handling and cleanup of temporary files.

## Prerequisites

-   **Node.js:** (v16 or later recommended) - [Download & Install Node.js](https://nodejs.org/)
-   **npm** or **yarn:** (Comes bundled with Node.js)
-   **ffmpeg:** A command-line tool for handling multimedia data. It must be installed and accessible in your system's PATH.
    -   [Download ffmpeg](https://ffmpeg.org/download.html)
    -   On macOS (using Homebrew): `brew install ffmpeg`
    -   On Debian/Ubuntu: `sudo apt update && sudo apt install ffmpeg`
-   **OpenAI API Key:** You need an API key from OpenAI with access to the TTS models.
    -   [Get an API Key](https://platform.openai.com/api-keys)

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Create environment file:**
    Create a file named `.env` in the project root directory and add your OpenAI API key:
    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    ```
4.  **Prepare input text:**
    Modify the `text.js` file to export the long text you want to convert. It should export a single string variable named `text`.
    ```javascript
    // text.js
    export const text = `
    Your very long text goes here...
    Chapter 1...
    ...
    `;
    ```

## Usage

Run the script from your terminal:

```bash
node tts.js
```

The script will:
1.  Read the text from `text.js`.
2.  Split it into chunks.
3.  Generate an MP3 file for each chunk (e.g., `ash-book-speech_part_1.mp3`, `ash-book-speech_part_2.mp3`, ...). Logs will show progress.
4.  If all chunks are generated successfully, it will call `ffmpeg` to concatenate them into `ash-book-final.mp3`.
5.  If concatenation is successful, the individual part files and the temporary `mylist.txt` will be deleted.

The final audiobook will be saved as `ash-book-final.mp3` in the project root directory.

## Configuration

You can adjust the following parameters directly in the `tts.js` script:

-   `MAX_CHUNK_LENGTH`: (Default: `4000`) Maximum characters per chunk. Keep below OpenAI's 4096 limit.
-   `openai.audio.speech.create` options:
    -   `model`: (Default: `"gpt-4o-mini-tts"`) Can be changed to `"tts-1"` or `"tts-1-hd"` (higher quality, higher cost/quota usage).
    -   `voice`: (Default: `"ash"`) Choose from available OpenAI voices (e.g., `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`).
    -   `speed`: (Default: `0.8`) Playback speed (0.25 to 4.0).
-   `finalOutputFileName`: (Default: `"ash-book-final.mp3"`) Name of the final concatenated file.
-   `speechFileBase`: (Default: `"./ash-book-speech"`) Base name for the intermediate part files.

## Troubleshooting

-   **`'ffmpeg' is not recognized...` or `command not found: ffmpeg`:** Ensure ffmpeg is installed correctly and its location is included in your system's PATH environment variable.
-   **`Error: spawn ffmpeg ENOENT`:** Same as above, Node.js cannot find the `ffmpeg` executable.
-   **OpenAI API Errors (429 Quota Exceeded, 401 Authentication Error):** Check your API key in `.env` and your OpenAI account's usage limits and billing status.
-   **Partial concatenation or errors during concatenation:** Check the `ffmpeg` output logged in the console for details. Ensure all part files were generated without errors. 
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { text } from "./text.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import process from 'node:process';
import { Buffer } from 'node:buffer';

dotenv.config();

const execPromise = promisify(exec);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Base path for output files - parts will be appended
const audioDir = path.resolve("./audio");
const speechFileBase = path.resolve(audioDir, "ash-book-speech");
const finalOutputFileName = path.resolve(audioDir, "ash-book-final.mp3");
const fileListPath = path.resolve(audioDir, "mylist.txt");

// Function to split text into chunks
function chunkText(inputText, maxLength) {
  const chunks = [];
  let start = 0;
  while (start < inputText.length) {
    let end = start + maxLength;
    // Basic word boundary check (optional but recommended)
    // Look backward from 'end' for a space or punctuation to avoid splitting mid-word
    if (end < inputText.length) {
        let lastSpace = inputText.lastIndexOf(' ', end);
        let lastPeriod = inputText.lastIndexOf('.', end);
        let splitPoint = Math.max(lastSpace, lastPeriod);
        // Use the boundary if found within a reasonable range (e.g., last 100 chars)
        if (splitPoint > start && end - splitPoint < 100) {
             end = splitPoint + 1; // Include the punctuation/space if desired or adjust
        }
        // If no good boundary found near the max length, just split at max length
    }


    chunks.push(inputText.substring(start, end));
    start = end;
  }
  return chunks;
}

// Define the maximum chunk size (IMPORTANT: OpenAI TTS API limit is 4096 characters)
const MAX_CHUNK_LENGTH = 4000; // Adjusted to be within OpenAI limits
const textChunks = chunkText(text, MAX_CHUNK_LENGTH);

console.log(`Text split into ${textChunks.length} chunks.`);
console.log("Starting TTS generation for each chunk...");

// Function to concatenate audio files using ffmpeg
async function concatenateAudioFiles(filePaths, finalOutputFile) {
    console.log(`Attempting to concatenate ${filePaths.length} files into ${finalOutputFile}...`);

    // 1. Create the file list content for ffmpeg
    const fileListContent = filePaths.map(filePath => `file '${path.basename(filePath)}'`).join('\n');
    try {
        await fs.promises.writeFile(fileListPath, fileListContent);
        console.log(`Created temporary file list: ${fileListPath}`);
    } catch (err) {
        console.error("Error writing ffmpeg file list:", err);
        return false; // Indicate failure
    }

    // 2. Construct the ffmpeg command
    // Ensure ffmpeg is installed and in your system's PATH
    // Using -safe 0 because file paths might be absolute or contain special characters
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${finalOutputFile}"`;
    console.log(`Executing: ${ffmpegCommand}`);

    // 3. Execute the command
    try {
        const { stderr } = await execPromise(ffmpegCommand);
        if (stderr && !stderr.includes('Output file is empty')) { // ffmpeg often outputs info to stderr
             console.log('ffmpeg output:', stderr); // Log output for debugging
        }
        console.log(`Successfully concatenated audio to: ${finalOutputFile}`);

        // 4. Cleanup (optional): Delete part files and list file
        console.log("Cleaning up temporary files...");
        await fs.promises.unlink(fileListPath);
        // for (const filePath of filePaths) {
        //     await fs.promises.unlink(filePath);
        // }
        console.log("Cleanup complete.");
        return true; // Indicate success

    } catch (error) {
        console.error(`Error during ffmpeg concatenation: ${error}`);
        console.error('ffmpeg stderr:', error.stderr);
        console.error('ffmpeg stdout:', error.stdout);
        // Optionally leave temporary files for debugging
        // await fs.promises.unlink(fileListPath); // Uncomment to clean up list file even on error
        return false; // Indicate failure
    }
}

async function generateSpeech() {
    const generatedFiles = [];
    let success = true;

    for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const partNumber = i + 1;
        const outputFilePath = `${speechFileBase}_part_${partNumber}.mp3`;

        console.log(`Processing chunk ${partNumber}/${textChunks.length}...`);

        try {
            const mp3 = await openai.audio.speech.create({
                model: "gpt-4o-mini-tts",
                voice: "ash",
                input: chunk,
                speed: 0.8,
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());
            await fs.promises.writeFile(outputFilePath, buffer);
            console.log(`Saved: ${outputFilePath}`);
            generatedFiles.push(outputFilePath);

        } catch (error) {
            console.error(`Error processing chunk ${partNumber}:`, error);
            success = false;
            break;
        }
    }

    if (success && generatedFiles.length > 0) {
        console.log("\nFinished processing all chunks.");
        const finalOutputPath = path.resolve(`./${finalOutputFileName}`);
        await concatenateAudioFiles(generatedFiles, finalOutputPath);

    } else if (generatedFiles.length === 0) {
         console.log("\nNo audio files were generated.");
    } else {
         console.log("\nTTS generation failed for one or more chunks. Concatenation skipped.");
         console.log("You may need to manually concatenate the successfully generated files:", generatedFiles);
    }
}

generateSpeech();
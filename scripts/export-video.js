#!/usr/bin/env node
/**
 * Video Export Script for Editor Projects (Node.js version)
 * 
 * Usage: node export-video.js <project-json-file> <output-file>
 * 
 * Prerequisites:
 * - FFmpeg 5.0+ installed and in PATH
 * - Node.js 18+
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

/**
 * Download file from URL
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete partial file
      reject(err);
    });
  });
}

/**
 * Run FFmpeg command
 */
function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(filePath) {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

/**
 * Main export function
 */
async function exportVideo(projectJsonPath, outputPath) {
  log.info('Starting video export...');
  log.info(`Project: ${projectJsonPath}`);
  log.info(`Output: ${outputPath}`);
  
  // Read project JSON
  const projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
  
  // Create temp directory
  const tempDir = `./temp_export_${Date.now()}`;
  const clipsDir = path.join(tempDir, 'clips');
  const audioDir = path.join(tempDir, 'audio');
  
  fs.mkdirSync(clipsDir, { recursive: true });
  fs.mkdirSync(audioDir, { recursive: true });
  
  try {
    // Extract tracks
    const videoTrack = projectData.tracks?.find(t => t.type === 'video');
    const audioTrack = projectData.tracks?.find(t => t.type === 'audio');
    const textTrack = projectData.tracks?.find(t => t.type === 'text');
    
    // Settings
    const settings = projectData.settings || {};
    const fps = settings.fps || 30;
    const width = settings.resolution?.width || 1080;
    const height = settings.resolution?.height || 1920;
    
    log.info(`Resolution: ${width}x${height} @ ${fps}fps`);
    
    // Process video clips
    const videoClips = videoTrack?.clips || [];
    const filteredClips = [];
    
    log.info(`Processing ${videoClips.length} video clip(s)...`);
    
    for (let i = 0; i < videoClips.length; i++) {
      const clip = videoClips[i];
      const clipFile = path.join(clipsDir, `clip_${i}.mp4`);
      const filteredFile = path.join(clipsDir, `filtered_${i}.mp4`);
      
      log.info(`Downloading clip ${i}: ${clip.id}`);
      await downloadFile(clip.src, clipFile);
      log.success(`Downloaded: ${clipFile}`);
      
      // Calculate filter values
      const filter = clip.filter || {};
      const brightness = ((filter.brightness || 100) - 100) / 100;
      const contrast = (filter.contrast || 100) / 100;
      const saturation = (filter.saturation || 100) / 100;
      const duration = clip.duration || 5;
      
      log.info(`Applying filters to clip ${i}...`);
      
      // Apply filters with FFmpeg
      await runFFmpeg([
        '-y', '-i', clipFile,
        '-vf', `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-t', String(duration),
        filteredFile
      ]);
      
      filteredClips.push(filteredFile);
    }
    
    log.success(`All clips processed: ${filteredClips.length} clips`);
    
    // Concatenate clips
    log.info('Concatenating clips...');
    const combinedVideo = path.join(tempDir, 'combined.mp4');
    
    if (filteredClips.length > 1) {
      // Create concat file
      const concatList = path.join(tempDir, 'concat.txt');
      const concatContent = filteredClips.map(f => `file '${path.relative(tempDir, f)}'`).join('\n');
      fs.writeFileSync(concatList, concatContent);
      
      await runFFmpeg([
        '-y', '-f', 'concat', '-safe', '0',
        '-i', concatList,
        '-c', 'copy',
        combinedVideo
      ]);
    } else if (filteredClips.length === 1) {
      fs.copyFileSync(filteredClips[0], combinedVideo);
    } else {
      throw new Error('No video clips found');
    }
    
    log.success('Combined video created');
    
    let finalVideo = combinedVideo;
    
    // Mix audio if present
    const audioClips = audioTrack?.clips || [];
    if (audioClips.length > 0 && audioClips[0].src) {
      const audioClip = audioClips[0];
      const audioFile = path.join(audioDir, 'music.mp3');
      
      log.info('Downloading audio track...');
      await downloadFile(audioClip.src, audioFile);
      
      log.info('Mixing audio...');
      const mixedVideo = path.join(tempDir, 'with_audio.mp4');
      const videoDuration = await getVideoDuration(combinedVideo);
      const audioVolume = audioClip.volume || 1;
      
      await runFFmpeg([
        '-y', '-i', combinedVideo, '-i', audioFile,
        '-filter_complex', `[0:a]volume=1.0[a0]; [1:a]volume=${audioVolume},atrim=0:${videoDuration}[a1]; [a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        '-map', '0:v', '-map', '[aout]',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-shortest',
        mixedVideo
      ]);
      
      finalVideo = mixedVideo;
      log.success('Audio mixed');
    }
    
    // Add text overlays if present
    const textClips = textTrack?.clips || [];
    if (textClips.length > 0) {
      const textFilters = textClips.map(text => {
        const posX = (text.position?.x || 50) * width / 100;
        const posY = (text.position?.y || 50) * height / 100;
        const fontSize = text.style?.fontSize || 48;
        const fontColor = (text.style?.color || '#ffffff').replace('#', '');
        const start = text.start || 0;
        const end = text.end || 10;
        const content = (text.content || '').replace(/'/g, "\\'");
        
        return `drawtext=text='${content}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${Math.round(posX)}-text_w/2:y=${Math.round(posY)}-text_h/2:enable='between(t\\,${start}\\,${end})'`;
      });
      
      log.info('Applying text overlays...');
      const textVideo = path.join(tempDir, 'with_text.mp4');
      
      await runFFmpeg([
        '-y', '-i', finalVideo,
        '-vf', textFilters.join(','),
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'copy',
        textVideo
      ]);
      
      finalVideo = textVideo;
      log.success('Text overlays applied');
    }
    
    // Copy to output
    log.info('Creating final output...');
    fs.copyFileSync(finalVideo, outputPath);
    
    // Get final stats
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const duration = await getVideoDuration(outputPath);
    
    log.success('=========================================');
    log.success('Export complete!');
    log.success(`Output: ${outputPath}`);
    log.success(`Size: ${sizeMB} MB`);
    log.success(`Duration: ${duration.toFixed(2)}s`);
    log.success('=========================================');
    
  } finally {
    // Cleanup
    log.info('Cleaning up temporary files...');
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// CLI Entry point
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node export-video.js <project-json-file> <output-file>');
  console.log('');
  console.log('Example:');
  console.log('  node export-video.js project.json output.mp4');
  process.exit(1);
}

exportVideo(args[0], args[1]).catch(err => {
  log.error(err.message);
  process.exit(1);
});

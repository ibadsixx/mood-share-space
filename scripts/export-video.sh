#!/bin/bash
#
# Video Export Script for Editor Projects
# Usage: ./export-video.sh <project-json-file> <output-file>
#
# Prerequisites:
# - FFmpeg 5.0+ installed
# - jq for JSON parsing
# - curl for downloading files
#

set -e

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate arguments
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <project-json-file> <output-file>"
    echo ""
    echo "Example:"
    echo "  $0 project.json output.mp4"
    exit 1
fi

PROJECT_JSON="$1"
OUTPUT_FILE="$2"
TEMP_DIR="./temp_export_$(date +%s)"

# Check dependencies
command -v ffmpeg >/dev/null 2>&1 || { log_error "FFmpeg is required but not installed."; exit 1; }
command -v jq >/dev/null 2>&1 || { log_error "jq is required but not installed."; exit 1; }
command -v curl >/dev/null 2>&1 || { log_error "curl is required but not installed."; exit 1; }

log_info "Starting video export..."
log_info "Project: $PROJECT_JSON"
log_info "Output: $OUTPUT_FILE"

# Create temp directory
mkdir -p "$TEMP_DIR/clips"
mkdir -p "$TEMP_DIR/audio"

# Parse project JSON
log_info "Parsing project JSON..."

# Extract video clips
VIDEO_CLIPS=$(jq -r '.tracks[] | select(.type == "video") | .clips[]' "$PROJECT_JSON")
AUDIO_CLIPS=$(jq -r '.tracks[] | select(.type == "audio") | .clips[]?' "$PROJECT_JSON")
TEXT_CLIPS=$(jq -r '.tracks[] | select(.type == "text") | .clips[]?' "$PROJECT_JSON")

# Get settings
FPS=$(jq -r '.settings.fps // 30' "$PROJECT_JSON")
WIDTH=$(jq -r '.settings.resolution.width // 1080' "$PROJECT_JSON")
HEIGHT=$(jq -r '.settings.resolution.height // 1920' "$PROJECT_JSON")

log_info "Resolution: ${WIDTH}x${HEIGHT} @ ${FPS}fps"

# Download video clips
log_info "Downloading video clips..."
CLIP_INDEX=0
CONCAT_LIST="$TEMP_DIR/concat.txt"
> "$CONCAT_LIST"

for clip in $(jq -r '.tracks[] | select(.type == "video") | .clips[] | @base64' "$PROJECT_JSON"); do
    _jq() {
        echo ${clip} | base64 --decode | jq -r ${1}
    }
    
    SRC=$(_jq '.src')
    ID=$(_jq '.id')
    DURATION=$(_jq '.duration // 5')
    BRIGHTNESS=$(_jq '.filter.brightness // 100')
    CONTRAST=$(_jq '.filter.contrast // 100')
    SATURATION=$(_jq '.filter.saturation // 100')
    
    log_info "Downloading clip $CLIP_INDEX: $ID"
    
    CLIP_FILE="$TEMP_DIR/clips/clip_${CLIP_INDEX}.mp4"
    FILTERED_FILE="$TEMP_DIR/clips/filtered_${CLIP_INDEX}.mp4"
    
    # Download clip
    curl -L -s -o "$CLIP_FILE" "$SRC"
    
    if [ ! -f "$CLIP_FILE" ]; then
        log_error "Failed to download clip: $SRC"
        exit 1
    fi
    
    log_success "Downloaded: $CLIP_FILE"
    
    # Calculate filter values
    BRIGHTNESS_VAL=$(echo "scale=2; ($BRIGHTNESS - 100) / 100" | bc)
    CONTRAST_VAL=$(echo "scale=2; $CONTRAST / 100" | bc)
    SATURATION_VAL=$(echo "scale=2; $SATURATION / 100" | bc)
    
    # Apply filters
    log_info "Applying filters to clip $CLIP_INDEX..."
    ffmpeg -y -i "$CLIP_FILE" \
        -vf "eq=brightness=$BRIGHTNESS_VAL:contrast=$CONTRAST_VAL:saturation=$SATURATION_VAL,scale=$WIDTH:$HEIGHT:force_original_aspect_ratio=decrease,pad=$WIDTH:$HEIGHT:(ow-iw)/2:(oh-ih)/2" \
        -c:v libx264 -preset fast -crf 23 \
        -c:a aac -b:a 128k \
        -t "$DURATION" \
        "$FILTERED_FILE" 2>/dev/null
    
    # Add to concat list
    echo "file 'clips/filtered_${CLIP_INDEX}.mp4'" >> "$CONCAT_LIST"
    
    CLIP_INDEX=$((CLIP_INDEX + 1))
done

log_success "All clips downloaded and filtered: $CLIP_INDEX clips"

# Concatenate clips
log_info "Concatenating clips..."
COMBINED_VIDEO="$TEMP_DIR/combined.mp4"

if [ $CLIP_INDEX -gt 1 ]; then
    cd "$TEMP_DIR"
    ffmpeg -y -f concat -safe 0 -i "concat.txt" \
        -c copy \
        "combined.mp4" 2>/dev/null
    cd - > /dev/null
else
    cp "$TEMP_DIR/clips/filtered_0.mp4" "$COMBINED_VIDEO"
fi

log_success "Combined video created"

# Download and mix audio if present
FINAL_VIDEO="$COMBINED_VIDEO"

for audio in $(jq -r '.tracks[] | select(.type == "audio") | .clips[] | @base64' "$PROJECT_JSON" 2>/dev/null); do
    _jq() {
        echo ${audio} | base64 --decode | jq -r ${1}
    }
    
    AUDIO_SRC=$(_jq '.src')
    AUDIO_VOLUME=$(_jq '.volume // 1')
    
    if [ "$AUDIO_SRC" != "null" ] && [ -n "$AUDIO_SRC" ]; then
        log_info "Downloading audio track..."
        AUDIO_FILE="$TEMP_DIR/audio/music.mp3"
        curl -L -s -o "$AUDIO_FILE" "$AUDIO_SRC"
        
        log_info "Mixing audio..."
        MIXED_VIDEO="$TEMP_DIR/with_audio.mp4"
        
        # Get video duration
        VIDEO_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$COMBINED_VIDEO")
        
        ffmpeg -y -i "$COMBINED_VIDEO" -i "$AUDIO_FILE" \
            -filter_complex "[0:a]volume=1.0[a0]; [1:a]volume=$AUDIO_VOLUME,atrim=0:$VIDEO_DURATION[a1]; [a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]" \
            -map 0:v -map "[aout]" \
            -c:v copy -c:a aac -b:a 192k \
            -shortest \
            "$MIXED_VIDEO" 2>/dev/null
        
        FINAL_VIDEO="$MIXED_VIDEO"
        log_success "Audio mixed"
    fi
    break  # Only process first audio track
done

# Add text overlays if present
TEXT_FILTER=""
for text in $(jq -r '.tracks[] | select(.type == "text") | .clips[] | @base64' "$PROJECT_JSON" 2>/dev/null); do
    _jq() {
        echo ${text} | base64 --decode | jq -r ${1}
    }
    
    CONTENT=$(_jq '.content')
    START=$(_jq '.start // 0')
    END=$(_jq '.end // 10')
    POS_X=$(_jq '.position.x // 50')
    POS_Y=$(_jq '.position.y // 50')
    FONT_SIZE=$(_jq '.style.fontSize // 48')
    FONT_COLOR=$(_jq '.style.color // "#ffffff"')
    
    # Convert hex color to FFmpeg format (remove #)
    FONT_COLOR=${FONT_COLOR#"#"}
    
    # Calculate position (percentage to pixels)
    X_POS=$(echo "scale=0; $WIDTH * $POS_X / 100" | bc)
    Y_POS=$(echo "scale=0; $HEIGHT * $POS_Y / 100" | bc)
    
    if [ -n "$TEXT_FILTER" ]; then
        TEXT_FILTER="$TEXT_FILTER,"
    fi
    
    # Escape special characters in content
    CONTENT_ESCAPED=$(echo "$CONTENT" | sed "s/'/'\\\\''/g")
    
    TEXT_FILTER="${TEXT_FILTER}drawtext=text='$CONTENT_ESCAPED':fontsize=$FONT_SIZE:fontcolor=$FONT_COLOR:x=$X_POS-text_w/2:y=$Y_POS-text_h/2:enable='between(t,$START,$END)'"
    
    log_info "Text overlay: '$CONTENT' at ($X_POS, $Y_POS) from ${START}s to ${END}s"
done

if [ -n "$TEXT_FILTER" ]; then
    log_info "Applying text overlays..."
    TEXT_VIDEO="$TEMP_DIR/with_text.mp4"
    
    ffmpeg -y -i "$FINAL_VIDEO" \
        -vf "$TEXT_FILTER" \
        -c:v libx264 -preset fast -crf 23 \
        -c:a copy \
        "$TEXT_VIDEO" 2>/dev/null
    
    FINAL_VIDEO="$TEXT_VIDEO"
    log_success "Text overlays applied"
fi

# Copy final output
log_info "Creating final output..."
cp "$FINAL_VIDEO" "$OUTPUT_FILE"

# Get final file info
FINAL_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
FINAL_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null)

# Cleanup
log_info "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
log_success "========================================="
log_success "Export complete!"
log_success "Output: $OUTPUT_FILE"
log_success "Size: $FINAL_SIZE"
log_success "Duration: ${FINAL_DURATION}s"
log_success "========================================="

"""
Assembles final video from: background image/slideshow + voiceover audio + subtitles.
Uses ffmpeg (free, no watermark). No paid tools required.
"""

import json
import os
import subprocess
from pathlib import Path
from config import VIDEO_DIR, ASSETS_DIR, AUDIO_DIR, THUMBNAIL_DIR, VIDEO_RESOLUTION, VIDEO_FPS


BACKGROUND_COLOR = "0A0A2E"  # Dark navy (finance niche)


def get_audio_duration(audio_path: str) -> float:
    """Return duration of MP3 in seconds using ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
        capture_output=True, text=True
    )
    return float(result.stdout.strip())


def create_background_image(slug: str) -> str:
    """Create a simple dark background image if no asset exists."""
    bg_path = f"{ASSETS_DIR}/bg_{slug}.png"
    if os.path.exists(bg_path):
        return bg_path

    Path(ASSETS_DIR).mkdir(exist_ok=True)
    w, h = VIDEO_RESOLUTION
    # Use ffmpeg to create a colored background
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c=#{BACKGROUND_COLOR}:size={w}x{h}:rate={VIDEO_FPS}",
        "-vframes", "1",
        bg_path, "-loglevel", "quiet"
    ]
    subprocess.run(cmd, check=True)
    return bg_path


def assemble_video(script_path: str) -> str | None:
    """
    Combine audio + background into an MP4.
    - Uses thumbnail as the video background for static look
    - Adds audio track
    - Outputs to VIDEO_DIR
    Returns path to output MP4.
    """
    Path(VIDEO_DIR).mkdir(parents=True, exist_ok=True)

    with open(script_path) as f:
        data = json.load(f)

    slug = Path(script_path).stem
    audio_path = f"{AUDIO_DIR}/{slug}.mp3"
    thumbnail_path = f"{THUMBNAIL_DIR}/{slug}.jpg"
    output_path = f"{VIDEO_DIR}/{slug}.mp4"

    if not os.path.exists(audio_path):
        print(f"  Audio not found: {audio_path}. Run voice_generator first.")
        return None

    # Use thumbnail as background if available, otherwise solid color
    if os.path.exists(thumbnail_path):
        bg_input = thumbnail_path
        video_filter = f"scale={VIDEO_RESOLUTION[0]}:{VIDEO_RESOLUTION[1]}:force_original_aspect_ratio=decrease,pad={VIDEO_RESOLUTION[0]}:{VIDEO_RESOLUTION[1]}:(ow-iw)/2:(oh-ih)/2"
    else:
        bg_input = None

    duration = get_audio_duration(audio_path)
    print(f"  Audio duration: {duration:.1f}s ({duration/60:.1f} min)")

    if bg_input:
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", bg_input,
            "-i", audio_path,
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-vf", video_filter,
            "-pix_fmt", "yuv420p",
            "-shortest",
            "-r", str(VIDEO_FPS),
            output_path,
            "-loglevel", "warning"
        ]
    else:
        w, h = VIDEO_RESOLUTION
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"color=c=#{BACKGROUND_COLOR}:size={w}x{h}:rate={VIDEO_FPS}",
            "-i", audio_path,
            "-c:v", "libx264",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            output_path,
            "-loglevel", "warning"
        ]

    print(f"  Assembling video...")
    result = subprocess.run(cmd)

    if result.returncode == 0:
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"  Video ready: {output_path} ({size_mb:.1f} MB)")
        return output_path

    print("  ffmpeg failed.")
    return None


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if path:
        result = assemble_video(path)
        print(f"Video: {result}")
    else:
        print("Usage: python video_assembler.py scripts/your_script.json")

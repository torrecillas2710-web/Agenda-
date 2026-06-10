"""
Converts scripts to realistic voiceover audio using ElevenLabs free tier.
Free tier: 10,000 characters/month (~7 minutes of audio per month).
Upgrade to Starter ($5/mo) for 30,000 chars (~21 min/month).
"""

import json
import os
import re
import requests
from pathlib import Path
from config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, AUDIO_DIR

ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech"
CHUNK_SIZE = 2500  # chars per API call (stay under free tier limits)


def split_into_chunks(text: str, max_chars: int = CHUNK_SIZE) -> list[str]:
    """Split text at sentence boundaries to stay under char limits."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks, current = [], ""
    for sentence in sentences:
        if len(current) + len(sentence) > max_chars:
            if current:
                chunks.append(current.strip())
            current = sentence
        else:
            current += " " + sentence
    if current:
        chunks.append(current.strip())
    return chunks


def text_to_speech(text: str, output_path: str) -> bool:
    """Convert text to MP3 using ElevenLabs. Returns True on success."""
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
        },
    }

    url = f"{ELEVENLABS_URL}/{ELEVENLABS_VOICE_ID}"
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(response.content)
        return True

    print(f"  ElevenLabs error {response.status_code}: {response.text[:200]}")
    return False


def generate_voiceover(script_path: str) -> str | None:
    """
    Read a script JSON, generate voiceover MP3, return audio path.
    For long scripts (>2500 chars), generates chunks and merges with ffmpeg.
    """
    Path(AUDIO_DIR).mkdir(parents=True, exist_ok=True)

    with open(script_path) as f:
        data = json.load(f)

    script_text = data["script"]
    slug = Path(script_path).stem
    chunks = split_into_chunks(script_text)

    print(f"  Script length: {len(script_text)} chars | Chunks: {len(chunks)}")

    if len(chunks) == 1:
        output_path = f"{AUDIO_DIR}/{slug}.mp3"
        success = text_to_speech(chunks[0], output_path)
        return output_path if success else None

    # Multiple chunks: generate each, then merge with ffmpeg
    chunk_paths = []
    for i, chunk in enumerate(chunks):
        chunk_path = f"{AUDIO_DIR}/{slug}_chunk{i:02d}.mp3"
        print(f"  Generating chunk {i+1}/{len(chunks)} ({len(chunk)} chars)...")
        if text_to_speech(chunk, chunk_path):
            chunk_paths.append(chunk_path)
        else:
            return None

    # Merge chunks with ffmpeg
    merged_path = f"{AUDIO_DIR}/{slug}.mp3"
    list_file = f"{AUDIO_DIR}/{slug}_chunks.txt"
    with open(list_file, "w") as f:
        for p in chunk_paths:
            f.write(f"file '{os.path.abspath(p)}'\n")

    os.system(f'ffmpeg -f concat -safe 0 -i "{list_file}" -c copy "{merged_path}" -y -loglevel quiet')

    # Cleanup chunk files
    for p in chunk_paths:
        os.remove(p)
    os.remove(list_file)

    print(f"  Merged audio: {merged_path}")
    return merged_path


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if path:
        result = generate_voiceover(path)
        print(f"Audio saved: {result}")
    else:
        print("Usage: python voice_generator.py scripts/your_script.json")

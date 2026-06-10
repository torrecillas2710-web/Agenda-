"""
Central configuration for the YouTube Finance Channel automation pipeline.
Set your API keys in the .env file (see .env.example).
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── API Keys ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
YOUTUBE_CLIENT_SECRETS_FILE = os.getenv("YOUTUBE_CLIENT_SECRETS_FILE", "client_secrets.json")

# ── ElevenLabs voice ─────────────────────────────────────────────────────────
# Free voices: Rachel, Drew, Clyde, Paul, Domi, Dave, Fin, Bella, Antoni, Elli
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Rachel

# ── Channel settings ─────────────────────────────────────────────────────────
CHANNEL_NAME = "WealthWise Tips"
CHANNEL_NICHE = "personal finance"
TARGET_AUDIENCE = "Americans aged 25-45 struggling with debt, savings, or investing"
CHANNEL_LANGUAGE = "English"

# ── Video settings ────────────────────────────────────────────────────────────
VIDEO_RESOLUTION = (1920, 1080)
VIDEO_FPS = 30
INTRO_DURATION_SEC = 3
OUTRO_DURATION_SEC = 5
WORDS_PER_MINUTE = 140          # ElevenLabs narration pace
TARGET_VIDEO_MINUTES = 10       # ~1,400 words per script

# ── Output directories ────────────────────────────────────────────────────────
OUTPUT_DIR = "output"
AUDIO_DIR = f"{OUTPUT_DIR}/audio"
VIDEO_DIR = f"{OUTPUT_DIR}/video"
THUMBNAIL_DIR = f"{OUTPUT_DIR}/thumbnails"
SCRIPTS_DIR = "scripts"
ASSETS_DIR = "assets"

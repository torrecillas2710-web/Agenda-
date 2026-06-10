"""
Uploads videos to YouTube using the YouTube Data API v3.
Requires OAuth2 credentials (client_secrets.json) — see SETUP.md for instructions.
"""

import json
import os
import pickle
from pathlib import Path

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from config import YOUTUBE_CLIENT_SECRETS_FILE

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
TOKEN_FILE = "youtube_token.pickle"

CATEGORY_IDS = {
    "personal finance": "27",  # Education
    "business": "27",
    "technology": "28",
}


def get_youtube_service():
    """Authenticate and return a YouTube API service object."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(YOUTUBE_CLIENT_SECRETS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)

    return build("youtube", "v3", credentials=creds)


def upload_video(script_path: str, video_path: str, thumbnail_path: str = None) -> str | None:
    """
    Upload video to YouTube. Returns video URL on success.
    Privacy is set to 'private' by default — change to 'public' when ready.
    """
    with open(script_path) as f:
        data = json.load(f)

    title = data.get("title", data["topic"]["title"])[:100]
    description = data.get("description", "")[:5000]
    tags = data.get("tags", [])[:500]

    youtube = get_youtube_service()

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": "27",  # Education
            "defaultLanguage": "en",
        },
        "status": {
            "privacyStatus": "private",  # Change to "public" when ready to publish
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(video_path, chunksize=-1, resumable=True, mimetype="video/mp4")

    print(f"  Uploading: {title}")
    request = youtube.videos().insert(part=",".join(body.keys()), body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  Progress: {int(status.progress() * 100)}%")

    video_id = response["id"]
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"  Uploaded! {video_url}")

    # Set thumbnail if provided
    if thumbnail_path and os.path.exists(thumbnail_path):
        youtube.thumbnails().set(
            videoId=video_id,
            media_body=MediaFileUpload(thumbnail_path)
        ).execute()
        print("  Thumbnail set.")

    return video_url


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3:
        script = sys.argv[1]
        video = sys.argv[2]
        thumb = sys.argv[3] if len(sys.argv) > 3 else None
        upload_video(script, video, thumb)
    else:
        print("Usage: python youtube_uploader.py scripts/x.json output/video/x.mp4 [thumbnail.jpg]")

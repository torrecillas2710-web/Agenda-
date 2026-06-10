"""
Generates YouTube video scripts for the personal finance niche using Google Gemini (free).
Each script is ~1,400 words (10 minutes at 140 wpm) with hooks, sections, and CTAs.
"""

import json
import os
import re
from pathlib import Path
import google.generativeai as genai
from config import (
    GEMINI_API_KEY, CHANNEL_NAME, TARGET_AUDIENCE,
    TARGET_VIDEO_MINUTES, WORDS_PER_MINUTE, SCRIPTS_DIR
)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

SYSTEM_PROMPT = f"""You are a professional YouTube scriptwriter for the channel "{CHANNEL_NAME}".
You write engaging, fact-based personal finance scripts for {TARGET_AUDIENCE}.

Script rules:
- Write ONLY the narration text (no stage directions, no [PAUSE], no visual cues)
- Use conversational American English, like talking to a friend
- Include a powerful hook in the first 30 seconds
- Break content into clear sections with natural transitions
- Include 2-3 real statistics or examples per section
- End with a strong call-to-action and subscribe reminder
- Target length: {TARGET_VIDEO_MINUTES * WORDS_PER_MINUTE} words
- No filler phrases like "In this video we will..." — start with the hook directly
"""


def generate_script(topic: dict) -> str:
    prompt = f"""{SYSTEM_PROMPT}

Write a complete YouTube script on this topic:
Title: {topic['title']}
Opening hook: "{topic['hook']}"
Target keywords: {', '.join(topic['keywords'])}
Call to action: {topic['cta']}

Write the full narration script now. Start immediately with the hook."""

    response = model.generate_content(prompt)
    return response.text


def generate_title_and_description(topic: dict, script: str) -> dict:
    prompt = f"""Based on this personal finance video script, create:
1. An optimized YouTube title (max 60 chars, clickbait but honest)
2. A YouTube description (150-200 words, includes keywords, timestamps, and affiliate disclaimer)
3. 15 relevant tags

Topic: {topic['title']}
Keywords: {', '.join(topic['keywords'])}

Return ONLY valid JSON with keys: title, description, tags (array). No extra text."""

    response = model.generate_content(prompt)
    text = response.text.strip()
    # Remove markdown code blocks if present
    text = re.sub(r"```json|```", "", text).strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    try:
        return json.loads(text[start:end])
    except Exception:
        return {"title": topic["title"], "description": "", "tags": topic["keywords"]}


def save_script(topic: dict, script: str, metadata: dict) -> str:
    Path(SCRIPTS_DIR).mkdir(exist_ok=True)
    slug = re.sub(r"[^a-z0-9_]", "", topic["title"].lower().replace(" ", "_"))[:50]
    filepath = f"{SCRIPTS_DIR}/{slug}.json"

    data = {
        "topic": topic,
        "script": script,
        "title": metadata.get("title", topic["title"]),
        "description": metadata.get("description", ""),
        "tags": metadata.get("tags", topic["keywords"]),
    }

    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  Saved: {filepath}")
    return filepath


def run_batch(topics_file: str = "topics.json", limit: int = 3):
    with open(topics_file) as f:
        topics = json.load(f)

    generated = []
    for topic in topics[:limit]:
        print(f"\n Generating script: {topic['title']}")
        script = generate_script(topic)
        print(f"  Words: {len(script.split())}")
        metadata = generate_title_and_description(topic, script)
        path = save_script(topic, script, metadata)
        generated.append(path)

    print(f"\n Done! {len(generated)} scripts generated.")
    return generated


if __name__ == "__main__":
    run_batch(limit=3)

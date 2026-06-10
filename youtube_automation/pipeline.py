"""
Main pipeline: runs all steps end-to-end for one or more topics.
Usage:
  python pipeline.py               # Process first 3 topics
  python pipeline.py --all         # Process all 15 topics
  python pipeline.py --upload      # Process and upload to YouTube
  python pipeline.py --topic 5     # Process only topic #5 (0-indexed)
"""

import argparse
import json
import sys
from pathlib import Path

from script_generator import generate_script, generate_title_and_description, save_script
from voice_generator import generate_voiceover
from thumbnail_generator import generate_for_script
from video_assembler import assemble_video


def process_topic(topic: dict, index: int, upload: bool = False) -> dict:
    """Run all pipeline steps for one topic. Returns result summary."""
    print(f"\n{'='*60}")
    print(f" Topic {index}: {topic['title']}")
    print(f"{'='*60}")

    result = {"topic": topic["title"], "steps": {}}

    # Step 1: Generate script
    print("\n[1/4] Generating script...")
    script = generate_script(topic)
    metadata = generate_title_and_description(topic, script)
    script_path = save_script(topic, script, metadata)
    result["steps"]["script"] = script_path
    result["script_path"] = script_path
    print(f"  Title: {metadata.get('title', topic['title'])}")

    # Step 2: Generate thumbnail
    print("\n[2/4] Creating thumbnail...")
    thumb_path = generate_for_script(script_path, palette_index=index)
    result["steps"]["thumbnail"] = thumb_path

    # Step 3: Generate voiceover
    print("\n[3/4] Generating voiceover...")
    audio_path = generate_voiceover(script_path)
    if not audio_path:
        print("  Voiceover failed — skipping video assembly.")
        return result
    result["steps"]["audio"] = audio_path

    # Step 4: Assemble video
    print("\n[4/4] Assembling video...")
    video_path = assemble_video(script_path)
    if not video_path:
        print("  Video assembly failed.")
        return result
    result["steps"]["video"] = video_path
    result["video_path"] = video_path

    # Optional: Upload to YouTube
    if upload:
        print("\n[5/5] Uploading to YouTube...")
        from youtube_uploader import upload_video
        url = upload_video(script_path, video_path, thumb_path)
        result["steps"]["youtube"] = url

    print(f"\n Done! All files ready.")
    return result


def main():
    parser = argparse.ArgumentParser(description="YouTube Finance Channel Automation Pipeline")
    parser.add_argument("--all", action="store_true", help="Process all topics")
    parser.add_argument("--upload", action="store_true", help="Upload to YouTube after processing")
    parser.add_argument("--topic", type=int, default=None, help="Process single topic by index")
    parser.add_argument("--limit", type=int, default=3, help="Number of topics to process (default: 3)")
    args = parser.parse_args()

    with open("topics.json") as f:
        topics = json.load(f)

    if args.topic is not None:
        selected = [topics[args.topic]]
        indices = [args.topic]
    elif args.all:
        selected = topics
        indices = list(range(len(topics)))
    else:
        selected = topics[:args.limit]
        indices = list(range(args.limit))

    results = []
    for i, topic in zip(indices, selected):
        result = process_topic(topic, i, upload=args.upload)
        results.append(result)

    # Summary
    print(f"\n{'='*60}")
    print(f" PIPELINE COMPLETE — {len(results)} videos")
    print(f"{'='*60}")
    for r in results:
        status = "✓" if r.get("video_path") else "✗"
        print(f"  {status} {r['topic']}")
        if r.get("video_path"):
            print(f"    Video: {r['video_path']}")
        if r.get("steps", {}).get("youtube"):
            print(f"    YouTube: {r['steps']['youtube']}")


if __name__ == "__main__":
    main()

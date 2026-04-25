#!/usr/bin/env python3
"""Batch TTS audio generator using Microsoft Edge TTS (en-GB-RyanNeural)."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

VOICE = "en-GB-RyanNeural"
AUDIO_DIR = Path("assets/audio")
TEXT_DIR = Path("assets/scenes")


def scene_file(scene_num: int) -> Path:
    return TEXT_DIR / f"scene-{scene_num:02d}.txt"


async def generate_one(scene_num: int, text_path: Path | None = None, force: bool = False) -> bool:
    """Generate MP3 + word-timing JSON for one scene."""
    if text_path is None:
        text_path = scene_file(scene_num)

    mp3_path = AUDIO_DIR / f"scene-{scene_num:02d}.mp3"
    words_path = AUDIO_DIR / f"scene-{scene_num:02d}-words.json"

    if mp3_path.exists() and words_path.exists() and not force:
        print(f"  Scene {scene_num:02d}: already exists (use --force to overwrite)")
        return True

    if not text_path.exists():
        print(f"  Scene {scene_num:02d}: text file not found: {text_path}", file=sys.stderr)
        return False

    text = text_path.read_text(encoding="utf-8").strip()
    if not text:
        print(f"  Scene {scene_num:02d}: text file is empty", file=sys.stderr)
        return False

    comm = edge_tts.Communicate(text, VOICE, boundary="WordBoundary")
    sub = edge_tts.SubMaker()

    mp3_path.parent.mkdir(parents=True, exist_ok=True)

    with open(mp3_path, "wb") as mp3_file:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                mp3_file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                sub.feed(chunk)

    words = []
    for cue in sub.cues:
        words.append({
            "word": cue.content,
            "start": round(cue.start.total_seconds(), 3),
            "end": round(cue.end.total_seconds(), 3),
        })

    words_path.write_text(json.dumps(words, indent=2), encoding="utf-8")
    print(f"  Scene {scene_num:02d}: OK ({len(words)} words, {mp3_path.stat().st_size} bytes)")
    return True


async def generate_range(start: int, end: int, force: bool = False) -> None:
    """Generate all scenes from start to end (inclusive)."""
    print(f"Voice: {VOICE}")
    failed = []
    for num in range(start, end + 1):
        ok = await generate_one(num, force=force)
        if not ok:
            failed.append(num)
    if failed:
        print(f"\nFailed scenes: {failed}", file=sys.stderr)
        sys.exit(1)
    print(f"\nAll {end - start + 1} scenes generated successfully.")


def main():
    parser = argparse.ArgumentParser(description="Batch TTS audio generator")
    parser.add_argument("--scene", type=int, help="Process a single scene number")
    parser.add_argument("--text-file", type=str, help="Override input text file path (for testing)")
    parser.add_argument("--start", type=int, help="Start of scene range (inclusive)")
    parser.add_argument("--end", type=int, help="End of scene range (inclusive)")
    parser.add_argument("--all", action="store_true", help="Process all scenes 00-34")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    args = parser.parse_args()

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    if args.scene is not None:
        text_path = Path(args.text_file) if args.text_file else None
        ok = asyncio.run(generate_one(args.scene, text_path=text_path, force=args.force))
        sys.exit(0 if ok else 1)
    elif args.all:
        asyncio.run(generate_range(0, 34, force=args.force))
    elif args.start is not None and args.end is not None:
        asyncio.run(generate_range(args.start, args.end, force=args.force))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

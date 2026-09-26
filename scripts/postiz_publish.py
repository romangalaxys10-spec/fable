#!/usr/bin/env python3
"""fable postiz — schedule/publish posts through a self-hosted or cloud Postiz.

Publishes text (optionally with an image) through the Postiz public API.
Keys env-only:

  POSTIZ_API_URL   e.g. POSTIZ_API_URL (your Postiz instance, /api/public/v1/posts)
  POSTIZ_API_KEY   your Postiz API key

Local --image files are uploaded first via Postiz's media endpoint
(POST /api/public/v1/upload with the file as multipart) and the returned
path is attached to the post — the API host cannot read local paths.

Usage:
  python3 postiz_publish.py --text "..." [--image path.png] [--date ISO8601]
"""

import argparse
import json
import os
import sys
import urllib.request
import uuid

API_URL = os.environ.get("POSTIZ_API_URL")
API_KEY = os.environ.get("POSTIZ_API_KEY")


def upload_media(path):
    """Upload a local file to Postiz; returns the remote path."""
    boundary = uuid.uuid4().hex
    fname = os.path.basename(path)
    with open(path, "rb") as fh:
        data = fh.read()
    body = (f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{fname}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n").encode() + \
        data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        API_URL.rsplit("/posts", 1)[0] + "/upload",
        data=body,
        headers={"Authorization": f"Bearer {API_KEY}",
                 "Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        remote = json.loads(resp.read().decode())
    # Postiz returns the uploaded path (string or list)
    return remote[0] if isinstance(remote, list) else remote.get("path", remote)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True)
    ap.add_argument("--image", help="local image path to upload and attach")
    ap.add_argument("--date", help="ISO8601 schedule time (omit = publish now)")
    a = ap.parse_args()

    if not API_URL or not API_KEY:
        print(json.dumps({"published": False,
                          "reason": "POSTIZ_API_URL / POSTIZ_API_KEY not set — skipping"}))
        return

    settings = [{"integration": []}]  # Postiz assigns configured integrations
    post = {"content": a.text, "settings": settings[0] and []}
    media = []
    if a.image and os.path.exists(a.image):
        try:
            remote = upload_media(a.image)
            media.append(remote if isinstance(remote, str) else remote.get("path"))
        except Exception as e:
            print(json.dumps({"published": False, "error": f"upload failed: {str(e)[:150]}"}))
            return
    payload = {
        "type": "draft" if a.date else "schedule" if a.date else "post",
        "date": a.date or "",
        "posts": [{
            "integration": [{"id": "xshredo-linkedin"}],
            "content": a.text,
            **({"media": media} if media else {}),
            **({"date": a.date} if a.date else {}),
        }],
    }
    req = urllib.request.Request(
        API_URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            print(json.dumps({"published": True, "status": resp.status}), flush=True)
    except Exception as e:
        print(json.dumps({"published": False, "error": str(e)[:200]}))


if __name__ == "__main__":
    main()

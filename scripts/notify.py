#!/usr/bin/env python3
"""fable notify — Telegram / Discord / generic webhook alerts.

Third notification channel for the escalation ladder and secmon. All keys
env-only, never stored:

  TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID   → Telegram Bot API sendMessage
  DISCORD_WEBHOOK_URL                     → Discord incoming webhook
  FABLE_WEBHOOK_URL                       → any generic JSON webhook

Priority: Telegram → Discord → generic webhook. With no keys configured,
the send is a no-op ({"sent": false, "reason": ...}) — callers degrade
gracefully and never crash.

Usage:
  python3 notify.py --message "text" [--severity critical|high|medium|low|info]
"""

import argparse
import json
import os
import sys
import urllib.request

UA = {"User-Agent": "fable-notify/1.0", "Content-Type": "application/json"}


def post(url, payload, timeout=15):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status


def send(message, severity):
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    tg_chat = os.environ.get("TELEGRAM_CHAT_ID")
    dc_url = os.environ.get("DISCORD_WEBHOOK_URL")
    gen_url = os.environ.get("FABLE_WEBHOOK_URL")

    text = f"[fable/{severity}] {message}"
    attempts = []

    if tg_token and tg_chat:
        try:
            status = post(f"https://api.telegram.org/bot{tg_token}/sendMessage",
                          {"chat_id": tg_chat, "text": text})
            attempts.append({"channel": "telegram", "ok": status == 200})
        except Exception as e:
            attempts.append({"channel": "telegram", "ok": False, "error": str(e)[:120]})
    if dc_url:
        try:
            status = post(dc_url, {"content": text})
            attempts.append({"channel": "discord", "ok": status in (200, 204)})
        except Exception as e:
            attempts.append({"channel": "discord", "ok": False, "error": str(e)[:120]})
    if gen_url:
        try:
            status = post(gen_url, {"severity": severity, "message": message})
            attempts.append({"channel": "webhook", "ok": status in (200, 201, 204)})
        except Exception as e:
            attempts.append({"channel": "webhook", "ok": False, "error": str(e)[:120]})

    if not attempts:
        return {"sent": False,
                "reason": "no notification channels configured "
                          "(set TELEGRAM_BOT_TOKEN+TELEGRAM_CHAT_ID, "
                          "DISCORD_WEBHOOK_URL, or FABLE_WEBHOOK_URL)"}
    return {"sent": any(a["ok"] for a in attempts), "attempts": attempts}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--message", required=True)
    ap.add_argument("--severity", default="info",
                    choices=["critical", "high", "medium", "low", "info"])
    a = ap.parse_args()
    print(json.dumps(send(a.message, a.severity), indent=2))


if __name__ == "__main__":
    main()

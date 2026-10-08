#!/usr/bin/env python3
"""fable report — generate noob-friendly HTML + PDF security reports from secmon runs.

Usage:
  python3 scripts/report.py <target> [--run-file run-XXXX.json] [--out-dir DIR]

Reads the latest (or given) secmon run JSON for <target>, renders:
  - <out-dir>/fable-sec-report-<target>-<date>.html  (styled, self-contained)
  - <out-dir>/fable-sec-report-<target>-<date>.pdf   (via headless Firefox/obscura — never Chrome)

The HTML embeds all findings with severity badges, plain-English explanations,
the proposed fix for each, and a compliance section. The PDF is the print
version of the same document.
"""

import datetime
import html
import json
import os
import re
import subprocess
import sys
import urllib.parse

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE = os.path.expanduser("~/.fable/secmon")
OUT_DIR_DEFAULT = os.path.join(PLUGIN_ROOT, "..", "reports")

SEV_COLORS = {"critical": "#c0392b", "high": "#e74c3c", "medium": "#f39c12",
              "low": "#f1c40f", "info": "#7f8c8d"}

PLAIN_EN = {
    # SEO/GEO finding ids (vendor/seo-geo/seoaudit.py)
    "no-schema": ("The page has no structured data (machine-readable labels).",
                  "AI search engines (ChatGPT, Perplexity, Google AI Overviews) are 3-5x less likely to cite or recommend your page — it is practically invisible to them."),
    "no-meta-desc": ("The page has no summary for search results.",
                     "Search engines guess what to show — your page looks uninviting in results and gets fewer clicks."),
    "title-missing": ("The page has no title tag.",
                      "Your page shows up nameless in search results and browser tabs — nearly impossible to find or trust."),
    "title-length": ("The title is too long or too short.",
                     "Long titles get cut off in search results; short ones miss keywords — fewer clicks."),
    "multiple-h1": ("The page has several main headlines.",
                    "Search engines get confused about what the page is really about, hurting rankings."),
    "no-h1": ("The page has no main headline.",
              "Same effect: rankings suffer because the topic is unclear."),
    "thin-content": ("The page has very little text.",
                     "Thin pages rarely rank in search and are never cited by AI assistants."),
    "no-lists": ("No structured lists on the page.",
                 "AI assistants strongly prefer lists when building answers — without them your page gets skipped."),
    "no-og": ("No social-share preview tags.",
              "When someone shares your link, it shows up blank — fewer clicks from chats and social media."),
    "img-alt": ("Some images have no alt text.",
                "Search engines cannot see those images, and screen-reader users miss them."),
    "no-lazy": ("Images all load at once.",
                "The page loads slower than it should, which hurts rankings."),
    "hdr-hsts": ("Browsers are not locked to the secure HTTPS connection.",
                 "An attacker on the same Wi-Fi network could trick a visitor's browser into using the insecure version of your site."),
    "csp-unsafe-inline": ("The site allows code snippets to be injected into pages.",
                          "If someone manages to plant malicious code in your site's data, that code WILL run in your visitors' browsers — it could fake your site or steal what visitors see."),
    "csp-style-unsafe-inline": ("The site allows style injection into pages.",
                                "Lowest risk: an attacker could only mess with how the page looks, not steal data."),
    "csp-missing": ("No Content-Security-Policy is configured.",
                    "There are no guardrails on what scripts the page may load, so any injected script runs freely."),
    "tls-legacy": ("The server still accepts very old encryption standards.",
                   "Old encryption can be broken, allowing interception of traffic from outdated devices."),
    "tls-expiring": ("The security certificate expires soon.",
                     "If it expires, visitors see scary warnings and may think the site is unsafe."),
    "tls-selfsigned": ("The certificate is self-signed.",
                       "Browsers warn every visitor — it looks unprofessional and unsafe."),
    "leak-.env": ("Your configuration file with passwords is publicly downloadable.",
                  "Anyone on the internet can read your database passwords and API keys right now. This is the most urgent kind of finding."),
    "admin-200": ("The admin page opens without logging in.",
                  "Usually it's just the login screen — but if it shows real data, strangers can see it."),
    "repo-secret": ("A password or API key is sitting in a code file.",
                    "Anyone with the code (or a leaked copy) gets your credentials. Rotate them immediately."),
    "repo-env-tracked": ("Password files are saved in the code repository.",
                         "Every copy of the repository carries your secrets — one careless share leaks them all."),
    "dep-vulnerable": ("A software library with a known hole is used in the project.",
                       "Attackers scan for these exact versions automatically — this is how most sites get hacked."),
    "code-pattern": ("Risky coding pattern found in the codebase.",
                     "Patterns like weak hashing or disabled security checks are the doors attackers try first."),
    "open-redirect": ("The site can be tricked into sending visitors to fake websites.",
                      "Phishing: a visitor thinks they're on your site, then gets sent to an attacker's fake login."),
    "vps-port": ("An unexpected door is open on your server.",
                 "Database or admin services reachable from the internet are how servers get taken over."),
    "sweep-port": ("An unexpected door is open on your server.",
                   "Same as above — every open door is one more thing to guard."),
    "hdr-server-present": ("The server tells visitors what software it runs.",
                           "Attackers use this to pick matching exploits. Low risk, free to fix."),
    "hdr-xcto": ("Browsers may guess file types wrongly.",
                 "This can turn an innocent upload into an executing script."),
    "hdr-frame": ("The site can be embedded inside other sites.",
                  "Clickjacking: a visitor clicks your button but the action happens on a hidden attacker page."),
    "hdr-cookie-secure": ("Login cookies can travel over insecure connections.",
                          "Someone on the same network could steal a visitor's session."),
    "default": ("Security weakness detected.",
                "Review the details below and apply the suggested fix."),
}

SEV_PLAIN = {
    "critical": "URGENT — fix today. This can cause real damage right now.",
    "high": "Important — fix this week. Attackers actively look for these.",
    "medium": "Worth fixing soon. Not an emergency, but closes a door.",
    "low": "Minor. Fix when convenient — ignoring is acceptable.",
    "info": "For your awareness. No action usually needed.",
}


def find_run(target, run_file=None):
    # dir slug must match secmonitor.py's (dots kept); only report FILENAMES use the hardened slug
    d = os.path.join(BASE, re.sub(r"[^a-z0-9.-]+", "-", target.lower().replace("https://", "").replace("http://", "")).strip("-"))
    if run_file:
        p = os.path.join(d, run_file)
        return json.load(open(p)), p
    runs = sorted(f for f in os.listdir(d) if f.startswith("run-") and f.endswith(".json"))
    if not runs:
        raise FileNotFoundError(f"no secmon runs for {target} — run secmonitor.py record first")
    p = os.path.join(d, runs[-1])
    return json.load(open(p)), p


def plain_expl(fid, title):
    for key, (what, why) in PLAIN_EN.items():
        if fid.startswith(key) or key in fid:
            return what, why
    return PLAIN_EN["default"]


def html_report(run):
    target = run.get("target", "unknown")
    findings = run.get("findings", [])
    summary = run.get("summary", {})
    comp = run.get("compliance", {})
    ts = run.get("ts", "")[:19].replace("T", " ")
    order = ["critical", "high", "medium", "low", "info"]
    findings.sort(key=lambda f: order.index(f.get("severity", "info")))

    cards = []
    is_seo = run.get("engine") == "seo-geo"
    scores = run.get("scores", {})
    for f in findings:
        sev = f.get("severity", "info")
        fid = f.get("id", "finding")
        what, why = plain_expl(fid, f.get("title", ""))
        # SEO/GEO runs carry their own per-finding recommendation
        reco = f.get("recommendation")
        fix_inner = (f"<p>{html.escape(reco)}</p>" if reco else
                     f"""<ol>
          <li>Apply the targeted fix for <code>{html.escape(fid)}</code> (exact file/config shared in chat before any change).</li>
          <li>Re-run the scan to confirm this finding moves to “fixed”.</li>
          <li>If the fix could affect visitors, we verify the site renders normally first.</li>
        </ol>""")
        cards.append(f"""
    <div class="card">
      <div class="sevline"><span class="badge {sev}">{sev.upper()}</span>
        <span class="fid">{html.escape(fid)}</span></div>
      <h3>{html.escape(f.get("title",""))}</h3>
      <p class="what"><b>What is this?</b> {what}</p>
      <p class="why"><b>Why you should care:</b> {why}</p>
      <p class="verdict"><b>Our verdict:</b> {SEV_PLAIN.get(sev,'')}</p>
      <div class="plan"><b>Proposed fix plan (approved separately):</b>
        {fix_inner}
      </div>
      {f'<div class="comp"><b>Standards this violates:</b> {", ".join(comp.get(fid, []))}</div>' if comp.get(fid) else ''}
    </div>""")

    scores_html = ""
    if is_seo and scores:
        rows = "".join(f"<tr><td style='padding:4px 14px'>{k}</td>"
                       f"<td style='padding:4px 14px'><b>{v}</b>/100</td></tr>"
                       for k, v in scores.items())
        scores_html = (f"<div class='summary'><b>Scores:</b> overall {run.get('overallScore','?')}/100 "
                       f"(SEO {run.get('seoScore','?')} · GEO {run.get('geoScore','?')})"
                       f"<table style='margin-top:10px;color:#c9d2ee'>{rows}</table></div>")

    badges = "".join(f'<span class="badge {s}">{s}: {summary.get(s,0)}</span>'
                     for s in order if summary.get(s, 0))
    verdict_line = ("Good news: no urgent findings." if not (summary.get("critical") or summary.get("high"))
                    else f"There {'are' if (summary.get('critical',0)+summary.get('high',0))>1 else 'is'} "
                         f"<b>{summary.get('critical',0)+summary.get('high',0)} urgent item(s)</b> to fix — shown first below.")
    report_kind = "SEO + GEO Visibility Report" if is_seo else "Security Report"

    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Fable {report_kind} — {html.escape(target)}</title>
<style>
body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0e27;color:#f5f7fc;margin:0;padding:32px}}
.wrap{{max-width:860px;margin:0 auto}}
h1{{font-size:34px;margin:0}} .sub{{color:#9aa4c8;margin:6px 0 24px}}
.badge{{padding:3px 12px;border-radius:12px;color:#fff;font-size:13px;font-weight:700;text-transform:uppercase}}
.badge.critical{{background:#c0392b}}.badge.high{{background:#e74c3c}}.badge.medium{{background:#f39c12}}
.badge.low{{background:#f1c40f;color:#333}}.badge.info{{background:#7f8c8d}}
.summary{{background:#161b3a;border:1px solid #3c4678;border-radius:14px;padding:18px 22px;margin:18px 0}}
.summary .badges{{margin-top:8px}}
.verdictbox{{background:#101636;border-left:4px solid #38e0ff;border-radius:10px;padding:14px 18px;margin:16px 0;font-size:16px}}
.card{{background:#161b3a;border:1px solid #3c4678;border-radius:14px;padding:20px 24px;margin:16px 0;page-break-inside:avoid}}
.card h3{{margin:6px 0 10px;font-size:20px;color:#fff}}
.sevline{{display:flex;gap:10px;align-items:center}} .fid{{color:#8f9bc4;font-family:monospace;font-size:13px}}
.what,.why{{color:#c9d2ee}} .why{{border-left:3px solid #e74c3c;padding-left:12px}}
.verdict{{color:#38e0ff}} .plan{{background:#0d1230;border-radius:10px;padding:12px 16px;font-size:14px;color:#c9d2ee}}
.comp{{margin-top:10px;color:#9aa4c8;font-size:13px}}
footer{{color:#6d76a0;font-size:12px;margin-top:28px;text-align:center}}
@media print {{ body{{background:#fff;color:#111}} .card{{border-color:#ddd;background:#fff;color:#111}}
 .what,.why{{color:#333}} .plan{{background:#f6f8fa;color:#333}} .verdictbox{{color:#111}} .sub,.fid,.comp{{color:#555}} }}
</style></head><body><div class="wrap">
<h1>🛡️ Fable {report_kind}</h1>
<div class="sub">Target: <b>{html.escape(target)}</b> · Scanned: {ts} · Generated by /fable</div>
<div class="verdictbox">{verdict_line} Every item below has a proposed fix — reply “fix” or “ignore” per item (or “fix all”).</div>
<div class="summary"><b>Summary:</b><div class="badges">{badges or 'clean'}</div></div>
{scores_html}
{''.join(cards)}
<footer>Generated by the fable plugin · findings stored in ~/.fable/secmon · fixes require your explicit approval</footer>
</div></body></html>"""


def to_pdf(pdf_path, run, report_kind="Security Report"):
    """Native PDF via reportlab (pure Python, offline) — styled to match the HTML."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                    Table, TableStyle, KeepTogether)
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.enums import TA_LEFT

    styles = getSampleStyleSheet()
    styles.add(__import__("reportlab").lib.styles.ParagraphStyle(
        "FTitle", parent=styles["Title"], fontSize=22, textColor=HexColor("#0b0e27")))
    styles.add(__import__("reportlab").lib.styles.ParagraphStyle(
        "FSub", parent=styles["Normal"], fontSize=10, textColor=HexColor("#555a7a")))
    styles.add(__import__("reportlab").lib.styles.ParagraphStyle(
        "FVerdict", parent=styles["Normal"], fontSize=11, textColor=HexColor("#0b0e27"),
        backColor=HexColor("#eef2ff"), borderColor=HexColor("#38e0ff"),
        borderWidth=1, borderPadding=8, leading=15))
    styles.add(__import__("reportlab").lib.styles.ParagraphStyle(
        "FWhat", parent=styles["Normal"], fontSize=10, leading=14, textColor=HexColor("#222")))
    styles.add(__import__("reportlab").lib.styles.ParagraphStyle(
        "FWhy", parent=styles["FWhat"], backColor=HexColor("#fdecea"),
        borderColor=HexColor("#e74c3c"), borderWidth=0.5, borderPadding=6))
    styles.add(__import__("reportlab").lib.styles.ParagraphStyle(
        "FPlan", parent=styles["Normal"], fontSize=9.5, leading=13,
        backColor=HexColor("#f6f8fa")))
    styles.add(__import__("reportlab").lib.styles.ParagraphStyle(
        "FH3", parent=styles["Heading3"], fontSize=13, spaceBefore=2, spaceAfter=4))

    SEV_HEX = {"critical": "#c0392b", "high": "#e74c3c", "medium": "#f39c12",
               "low": "#f1c40f", "info": "#7f8c8d"}
    order = ["critical", "high", "medium", "low", "info"]
    findings = sorted(run.get("findings", []),
                      key=lambda f: order.index(f.get("severity", "info")))
    summary = run.get("summary", {})
    comp = run.get("compliance", {})
    target = run.get("target", "unknown")

    doc = SimpleDocTemplate(pdf_path, pagesize=A4,
                            leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title=f"Fable {report_kind} — {target}")
    story = [Paragraph("🛡️ Fable Security Report", styles["FTitle"]),
             Paragraph(f"Target: <b>{target}</b> · Scanned: {run.get('ts','')[:19].replace('T',' ')} · "
                       f"Generated by /fable", styles["FSub"]),
             Spacer(1, 6)]
    urgent = summary.get("critical", 0) + summary.get("high", 0)
    story.append(Paragraph(
        ("Good news: no urgent findings." if urgent == 0 else
         f"<b>{urgent} urgent item(s)</b> to fix — shown first below. "
         "Reply “fix” or “ignore” per item; fixes are only applied after your approval."),
        styles["FVerdict"]))
    story.append(Spacer(1, 8))

    badge_data = [[Paragraph(f"<font color='{SEV_HEX[s]}'><b>{s.upper()}: {summary.get(s,0)}</b></font>",
                             styles["Normal"]) for s in order if summary.get(s, 0)]]
    if badge_data[0]:
        t = Table(badge_data, colWidths=[(doc.width) / max(1, len(badge_data[0]))] * len(badge_data[0]))
        t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.75, HexColor("#3c4678")),
                               ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#c9cfe6")),
                               ("LEFTPADDING", (0, 0), (-1, -1), 8),
                               ("TOPPADDING", (0, 0), (-1, -1), 6),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        story += [t, Spacer(1, 10)]

    for f in findings:
        sev = f.get("severity", "info")
        fid = f.get("id", "finding")
        what, why = plain_expl(fid, f.get("title", ""))
        block = [
            Paragraph(f"<font color='{SEV_HEX[sev]}'><b>{sev.upper()}</b></font> "
                      f"<font color='#888' size='8'>{fid}</font>", styles["Normal"]),
            Paragraph(f"<b>{f.get('title','')}</b>", styles["FH3"]),
            Paragraph(f"<b>What is this?</b> {what}", styles["FWhat"]),
            Spacer(1, 3),
            Paragraph(f"<b>Why you should care:</b> {why}", styles["FWhy"]),
            Spacer(1, 3),
            Paragraph(f"<b>Our verdict:</b> {SEV_PLAIN.get(sev,'')}", styles["FWhat"]),
            Spacer(1, 3),
            Paragraph(f"<b>Proposed fix plan:</b> apply the targeted fix for "
                      f"<font face='Courier'>{fid}</font> (exact file/config shared in chat "
                      f"before any change), then re-scan to confirm it moves to “fixed”.",
                      styles["FPlan"]),
        ]
        if comp.get(fid):
            block.append(Paragraph(f"<b>Standards this violates:</b> {', '.join(comp[fid])}",
                                   styles["FWhat"]))
        story.append(KeepTogether([*block, Spacer(1, 12)]))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Generated by the fable plugin · findings stored in "
                           "~/.fable/secmon · fixes require your explicit approval",
                           styles["FSub"]))
    doc.build(story)
    return "pdf via reportlab (offline, no browser)"


def main():
    a = sys.argv[1:]
    if not a:
        print(json.dumps({"error": 'usage: report.py <target> [--run-file run-XXXX.json] [--out-dir DIR]'}))
        sys.exit(3)
    target = a[0]
    run_file = a[a.index("--run-file") + 1] if "--run-file" in a else None
    out_dir = a[a.index("--out-dir") + 1] if "--out-dir" in a else OUT_DIR_DEFAULT
    run, _p = find_run(target, run_file)
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y-%m-%d")
    safe = re.sub(r"[^a-z0-9-]+", "-", target.lower().replace("https://", "").replace("http://", "")).strip("-")
    base = os.path.join(out_dir, f"fable-sec-report-{safe}-{stamp}")
    html_path = base + ".html"
    with open(html_path, "w", encoding="utf-8") as fh:
        fh.write(html_report(run))
    is_seo = run.get("engine") == "seo-geo"
    pdf_status = to_pdf(base + ".pdf", run, report_kind="SEO + GEO Visibility Report" if is_seo else "Security Report")
    print(json.dumps({"html": html_path, "pdf": base + ".pdf", "pdf_status": pdf_status,
                      "findings_in_report": len(run.get("findings", []))}, indent=2))


if __name__ == "__main__":
    main()

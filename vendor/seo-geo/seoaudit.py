#!/usr/bin/env python3
"""seoaudit.py — fable SEO + GEO auditor (heuristic engine).

Python port of the scoring model from romangalaxys10-spec/linker
(GEO-First SEO Intelligence Platform): audits a page for BOTH traditional
SEO (title, meta, headings, keywords, links, speed) and GEO — Generative
Engine Optimization (how citable the page is for AI search engines:
ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews).

Scores (0-100) returned per breakdown + findings with severity and exact
fix plans. Stdlib-only, non-invasive (2 GETs max), host-gated.

Usage:
  python3 seoaudit.py <url> [--json] [--store]

--store saves the run into ~/.fable/secmon/<target-slug>/ in the same
format secmonitor.py expects, so status/diff/trend/report all work for
SEO+GEO too.
"""

import argparse
import datetime
import json
import os
import re
import sys
import urllib.parse
import urllib.request

NOW = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
UA = {"User-Agent": "Mozilla/5.0 (compatible; fable-seoaudit/1.0)"}


def clamp(n):
    return max(0, min(100, round(n)))


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read(2 * 1024 * 1024).decode("utf-8", "replace")


# ------------------------------------------------------------ extraction

def strip_tags(html):
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.S | re.I)
    return re.sub(r"<[^>]+>", " ", text)


def meta_content(html, name):
    m = re.search(r'<meta[^>]+(?:name|property)=["\']' + re.escape(name) +
                  r'["\'][^>]*content=["\']([^"\']*)["\']', html, re.I)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:name|property)=["\']' +
                      re.escape(name) + r'["\']', html, re.I)
    return m.group(1) if m else ""


def get_title(html):
    m = re.search(r"<title[^>]*>([^<]*)</title>", html, re.I)
    return m.group(1).strip() if m else ""


def get_headings(html):
    out = []
    for m in re.finditer(r"<h([1-6])[^>]*>(.*?)</h\1>", html, re.S | re.I):
        txt = re.sub(r"<[^>]+>", " ", m.group(2))
        out.append((int(m.group(1)), re.sub(r"\s+", " ", txt).strip()))
    return out


def word_count(text):
    return len([w for w in text.split() if w.strip()])


# ------------------------------------------------------------ GEO scores

def score_content_clarity(text, headings):
    score, wc = 50, word_count(text)
    if wc > 300: score += 10
    if wc > 800: score += 10
    if wc > 1500: score += 5
    if headings: score += 5
    if any(h[0] == 1 for h in headings): score += 5
    if any(h[0] == 2 for h in headings): score += 5
    if len(headings) >= 3: score += 5
    sents = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    if sents:
        avg = sum(len(s.split()) for s in sents) / len(sents)
        if 10 <= avg <= 25: score += 5
    return clamp(score)


def score_structured_data(html, schema_count):
    score = 30
    if "application/ld+json" in html: score += 30
    if schema_count >= 2: score += 15
    if schema_count >= 3: score += 10
    for og in ("og:title", "og:description", "og:image"):
        if og in html: score += 5
    return clamp(score)


def score_authority(html, text):
    score, low = 35, text.lower()
    if "author" in html or "by " in low: score += 10
    if "published" in html or "datepublished" in html.lower() or "article:published_time" in html: score += 15
    if any(w in low for w in ("research", "study", "data")): score += 10
    cites = len(re.findall(r"according to|research shows|studies? (show|indicate|suggest)|sources?", low))
    if cites >= 1: score += 10
    if cites >= 3: score += 10
    if "faq" in html.lower() or "FAQPage" in html: score += 10
    return clamp(score)


def score_ai_readability(html, headings, text):
    score = 40
    h1 = [h for h in headings if h[0] == 1]
    h2 = [h for h in headings if h[0] == 2]
    if len(h1) == 1: score += 15
    if len(h2) >= 2: score += 10
    lists = len(re.findall(r"<ul[^>]*>|<ol[^>]*>", html, re.I))
    if lists >= 1: score += 10
    if lists >= 3: score += 5
    if "<table" in html.lower(): score += 10
    if "<dt" in html or "<dd" in html: score += 5
    if len(re.findall(r"<(strong|b)[^>]*>", html, re.I)) >= 3: score += 5
    return clamp(score)


def score_citation_readiness(html, text):
    score = 30
    if '"' in text or "\u201c" in text: score += 10
    numbers = re.findall(r"\d+(?:\.\d+)?%", text)
    if len(numbers) >= 1: score += 10
    if len(numbers) >= 3: score += 10
    ext = re.findall(r"<a[^>]*href=[\"']https?://[^\"']+[\"']", html, re.I)
    if len(ext) >= 2: score += 15
    if len(ext) >= 5: score += 10
    stats = re.findall(r"\$\d+|\d+\s*(million|billion|thousand|percent|%|people|users|customers)", text, re.I)
    if len(stats) >= 1: score += 10
    if len(stats) >= 3: score += 5
    return clamp(score)


def score_entity_coverage(text, title):
    score, full = 30, (title + " " + text).lower()
    if re.search(r"inc\.|corp|ltd|llc|organization|university|institute|company|group", full): score += 10
    if re.search(r"located in|based in|headquarters", full): score += 10
    tech = re.findall(r"algorithm|api|framework|protocol|architecture|infrastructure|platform|solution|methodology|system", full)
    if len(tech) >= 2: score += 10
    if len(tech) >= 5: score += 10
    caps = re.findall(r"[A-Z][a-z]+(?:\s[A-Z][a-z]+)+", text)
    if len(caps) >= 2: score += 10
    if len(caps) >= 5: score += 10
    return clamp(score)


# ------------------------------------------------------------ SEO scores

def score_title(title):
    if not title: return 0
    score, n = 40, len(title)
    if 30 <= n <= 60: score += 30
    elif 20 <= n <= 70: score += 15
    if any(c in title for c in "|-:"): score += 15
    if title[0].isupper(): score += 15
    return clamp(score)


def score_meta_desc(desc, title):
    if not desc: return 10
    score, n = 25, len(desc)
    if 120 <= n <= 160: score += 35
    elif 100 <= n <= 170: score += 20
    elif n >= 80: score += 10
    if any(w in desc.lower() for w in ("learn", "discover", "find", "get", "explore", "how to", "why", "best", "guide")): score += 15
    if desc != title: score += 15
    tw = [w for w in title.lower().split() if len(w) > 3]
    if any(w in desc.lower() for w in tw): score += 10
    return clamp(score)


def score_heading_structure(headings):
    score = 30
    h1 = [h for h in headings if h[0] == 1]
    h2 = [h for h in headings if h[0] == 2]
    h3 = [h for h in headings if h[0] == 3]
    if len(h1) == 1: score += 30
    elif len(h1) == 0: score -= 10
    if len(h2) >= 2: score += 20
    if len(h2) >= 4: score += 10
    if len(h3) >= 1: score += 10
    if h1 and headings and headings[0][0] == 1: score += 10
    return clamp(score)


def score_keyword_density(text, title, desc):
    tw = [w for w in title.lower().split() if len(w) > 3]
    if not tw: return 30
    low = text.lower()
    wc = max(1, word_count(text))
    matches = sum(low.count(w) for w in tw)
    density = matches / wc * 100
    score = 40
    if 0.5 <= density <= 3: score += 35
    elif 0.3 <= density <= 4: score += 20
    elif density > 0: score += 10
    if any(w in desc.lower() for w in tw): score += 15
    if len(set(low.split())) > 50: score += 10
    return clamp(score)


def score_internal_linking(html):
    score = 30
    internal = len(re.findall(r'<a[^>]*href=["\'](?:/|[^"\']*xshredo|#[^"])', html, re.I))
    external = len(re.findall(r'<a[^>]*href=["\']https?://', html, re.I))
    if internal >= 3: score += 30
    elif internal >= 1: score += 15
    if internal >= 5: score += 15
    if external > 0 and internal > 0: score += 15
    if internal >= 10: score += 10
    return clamp(score)


def score_page_speed(html):
    score = 60
    kb = len(html) / 1024
    if kb < 100: score += 20
    elif kb < 300: score += 10
    elif kb > 1000: score -= 10
    imgs = len(re.findall(r"<img[^>]*>", html, re.I))
    if imgs <= 5: score += 10
    elif imgs > 15: score -= 5
    if 'loading="lazy"' in html or "loading='lazy'" in html: score += 10
    return clamp(score)


# ------------------------------------------------------------ findings

FINDING_TIPS = {
    "no-schema": ("Pages with no structured data are 3-5x less likely to be cited by AI search engines.",
                  "Add JSON-LD (Organization + Article/WebSite + FAQPage) to the page head."),
    "no-meta-desc": ("Without a meta description, search engines and AI models guess what the page is about.",
                     "Add <meta name=\"description\"> with 120-160 chars including your main keyword."),
    "title-missing": ("Without a title tag, the page has no name in search results.",
                      "Add a 30-60 char <title> with your brand and main topic."),
    "title-length": ("Titles outside 30-60 chars get truncated or diluted in search results.",
                     "Rewrite the <title> to 50-60 chars: primary keyword | benefit | brand."),
    "no-h1": ("Without a single H1, search engines and AI can't tell what the page's main topic is.",
              "Add exactly one <h1> at the top describing the page topic."),
    "multiple-h1": ("Multiple H1s confuse search engines about the page's main topic.",
                    "Keep one <h1>; demote the rest to <h2>."),
    "thin-content": ("Pages under 300 words rarely rank or get cited by AI engines.",
                     "Expand to 800+ words of genuinely useful content (FAQ, examples, data)."),
    "no-lists": ("AI engines strongly prefer structured lists when extracting answers.",
                 "Break key points into <ul>/<ol> lists."),
    "no-og": ("Without Open Graph tags, shares on social/ messaging apps look broken.",
              "Add og:title, og:description, og:image meta tags."),
    "img-alt": ("Images without alt text are invisible to search engines and screen readers.",
                "Add descriptive alt attributes to every image."),
    "no-lazy": ("Images without lazy loading slow down page load.",
                "Add loading=\"lazy\" to below-the-fold images."),
}


def generate_findings(html, text, title, desc, headings, schema_count, imgs, url):
    findings = []
    def add(sev, fid, title_, desc_, fix):
        findings.append({"severity": sev, "id": fid, "title": title_,
                         "description": desc_[:240], "recommendation": fix,
                         "uid_src": f"{fid}|{title_}"})
    wc = word_count(text)
    if schema_count == 0:
        add("critical", "no-schema", "No structured data found", FINDING_TIPS["no-schema"][0], FINDING_TIPS["no-schema"][1])
    if not desc:
        add("high", "no-meta-desc", "No meta description", *FINDING_TIPS["no-meta-desc"])
    if not title:
        add("critical", "title-missing", "No title tag", *FINDING_TIPS["title-missing"])
    elif not (30 <= len(title) <= 60):
        add("medium", "title-length", f"Title length {len(title)} chars (ideal 30-60)", *FINDING_TIPS["title-length"])
    h1 = [h for h in headings if h[0] == 1]
    if len(h1) == 0:
        add("high", "no-h1", "No H1 heading", *FINDING_TIPS["no-h1"])
    elif len(h1) > 1:
        add("medium", "multiple-h1", f"{len(h1)} H1 headings on one page", *FINDING_TIPS["multiple-h1"])
    if wc < 300:
        add("medium", "thin-content", f"Thin content ({wc} words)", *FINDING_TIPS["thin-content"])
    if not re.findall(r"<ul[^>]*>|<ol[^>]*>", html, re.I):
        add("low", "no-lists", "No structured lists on page", *FINDING_TIPS["no-lists"])
    for og in ("og:title", "og:description", "og:image"):
        if og not in html:
            add("low", "no-og", f"Missing Open Graph tag: {og}", *FINDING_TIPS["no-og"])
            break
    no_alt = len(re.findall(r"<img(?![^>]*alt=)[^>]*>", html, re.I))
    if no_alt:
        add("medium", "img-alt", f"{no_alt} images without alt text", *FINDING_TIPS["img-alt"])
    imgs_all = len(re.findall(r"<img", html, re.I))
    if 'loading="lazy"' not in html and "loading='lazy'" not in html and imgs_all >= 3:
        add("low", "no-lazy", "No lazy loading on images", *FINDING_TIPS["no-lazy"])
    return findings


def generate_fixpack(result, out_dir):
    """Exact artifacts per finding: JSON-LD snippets, meta tags, title rewrite."""
    os.makedirs(out_dir, exist_ok=True)
    ids = {f["id"] for f in result.get("findings", [])}
    lines = ["# SEO/GEO Fix Pack — " + result.get("url", ""), "",
             "Copy each artifact into your page. Re-run the audit afterwards to confirm.", ""]

    if "no-schema" in ids:
        jsonld = """<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "YOUR PAGE TITLE",
  "description": "YOUR PAGE DESCRIPTION",
  "url": "%s",
  "author": { "@type": "Organization", "name": "YOUR BRAND" },
  "datePublished": "TODAY"
}
</script>""" % result.get("url", "https://example.com")
        with open(os.path.join(out_dir, "schema-jsonld.html"), "w") as fh:
            fh.write(jsonld)
        lines += ["## 1. Structured data (fixes no-schema)", "Paste into `<head>`:",
                  "```html", jsonld, "```", ""]
    if "no-meta-desc" in ids or "title-length" in ids:
        meta = ('<meta name="description" content="YOUR 150-CHAR SUMMARY WITH YOUR MAIN '
                'KEYWORD — learn why customers choose you.">')
        with open(os.path.join(out_dir, "meta-tags.html"), "w") as fh:
            fh.write(meta)
        lines += ["## 2. Meta tags (fixes no-meta-desc / title-length)",
                  "Paste into `<head>`, replace the ALL-CAPS parts:", "```html", meta, "```", ""]
    if "thin-content" in ids or "no-lists" in ids:
        lines += ["## 3. Content expansion (fixes thin-content / no-lists)",
                  "- Break key points into `<ul>` lists (AI engines extract lists first).",
                  "- Target 800+ words: add FAQ, examples, real numbers, sources.",
                  "- One `<h1>`, `<h2>` per major section.", ""]
    fixpack_path = os.path.join(out_dir, "FIXPACK.md")
    with open(fixpack_path, "w") as fh:
        fh.write("\n".join(lines))
    return {"fixpack_md": fixpack_path, "artifacts": os.listdir(out_dir)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--rendered", metavar="FILE",
                    help="audit this pre-rendered HTML file instead of fetching "
                         "(generate with scripts/js_fetch.py for JS/SPA pages)")
    ap.add_argument("--store", action="store_true", help="save run into ~/.fable/secmon (status/diff/report compatible)")
    ap.add_argument("--fixpack", metavar="DIR", help="generate exact fix artifacts (JSON-LD, meta tags) into DIR")
    args = ap.parse_args()

    url = args.url if args.url.startswith("http") else "https://" + args.url
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        print(json.dumps({"error": "only http/https schemes allowed"}))
        sys.exit(3)
    host = parsed.hostname or ""
    # resolve and validate EVERY address the hostname maps to (anti DNS-rebinding / private-target)
    try:
        import ipaddress as _ip, socket as _s
        for info in _s.getaddrinfo(host, 443, proto=_s.IPPROTO_TCP):
            a = _ip.ip_address(info[4][0])
            if a.is_private or a.is_loopback or a.is_link_local or a.is_reserved or a.is_unspecified:
                print(json.dumps({"error": f"refusing: {host} resolves to private/reserved {a}"}))
                sys.exit(3)
    except OSError as e:
        print(json.dumps({"error": f"cannot resolve host: {e}"}))
        sys.exit(3)

    if args.rendered:
        try:
            with open(args.rendered, encoding="utf-8", errors="replace") as fh:
                html = fh.read()
        except OSError as e:
            print(json.dumps({"error": f"cannot read rendered file: {e}"}))
            sys.exit(3)
    else:
        html = fetch(url)
    text = re.sub(r"\s+", " ", strip_tags(html))
    title = get_title(html)
    desc = meta_content(html, "description")
    headings = get_headings(html)
    schema_count = len(re.findall(r"application/ld\+json", html, re.I))
    imgs = len(re.findall(r"<img[^>]*>", html, re.I))

    geo = {
        "contentClarity": score_content_clarity(text, headings),
        "structuredData": score_structured_data(html, schema_count),
        "authoritySignals": score_authority(html, text),
        "aiReadability": score_ai_readability(html, headings, text),
        "citationReadiness": score_citation_readiness(html, text),
        "entityCoverage": score_entity_coverage(text, title),
    }
    seo = {
        "titleOptimization": score_title(title),
        "metaDescription": score_meta_desc(desc, title),
        "headingStructure": score_heading_structure(headings),
        "keywordDensity": score_keyword_density(text, title, desc),
        "internalLinking": score_internal_linking(html),
        "pageSpeed": score_page_speed(html),
    }
    geo_score = round(sum(geo.values()) / len(geo))
    seo_score = round(sum(seo.values()) / len(seo))
    findings = generate_findings(html, text, title, desc, headings, schema_count, imgs, url)

    result = {
        "url": url, "title": title, "ts": NOW(),
        "geoScore": geo_score, "seoScore": seo_score,
        "overallScore": round((geo_score + seo_score) / 2),
        "geoBreakdown": geo, "seoBreakdown": seo,
        "findings": findings,
        "engine": "seo-geo (heuristic port of linker geo-engine)",
    }

    if args.store:
        import hashlib
        slug = re.sub(r"[^a-z0-9.-]+", "-", url.lower().replace("https://", "").replace("http://", "")).strip("-")
        d = os.path.join(os.path.expanduser("~/.fable/secmon"), slug)
        os.makedirs(d, exist_ok=True)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S")
        for f in findings:
            f["uid"] = hashlib.sha1(f["uid_src"].encode()).hexdigest()[:12]
        run = {"ts": NOW(), "target": url, "exit": 1 if findings else 0,
               "summary": {s: sum(1 for f in findings if f["severity"] == s)
                           for s in ("critical", "high", "medium", "low", "info")},
               "findings": [{k: f.get(k) for k in ("severity", "id", "title", "uid", "recommendation")}
                            for f in findings],
               "compliance": {}, "engine": "seo-geo", "scores": {**geo, **seo},
               "overall": result["overallScore"], "raw_tail": ""}
        with open(os.path.join(d, f"run-{stamp}.json"), "w") as fh:
            json.dump(run, fh, indent=1)
        result["stored"] = f"run-{stamp}.json"

    if args.fixpack:
        result["fixpack"] = generate_fixpack(result, args.fixpack)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"SEO score: {seo_score}/100 | GEO score: {geo_score}/100 | overall: {result['overallScore']}/100")
        print(f"page: {title[:70]}")
        print("breakdown SEO:", seo)
        print("breakdown GEO:", geo)
        for f in findings:
            print(f"  [{f['severity'].upper():8}] {f['id']}: {f['title']}")
        if args.store:
            print(f"stored: {result.get('stored')}")
        if args.fixpack:
            print(f"fixpack: {result['fixpack'].get('fixpack_md')}")


if __name__ == "__main__":
    main()

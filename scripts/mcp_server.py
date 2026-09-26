#!/usr/bin/env python3
"""fable MCP server — expose Fable's core tools to ANY MCP client.

stdio JSON-RPC (initialize / tools/list / tools/call). Wrap the existing
fable scripts as MCP tools so Cursor, Claude Desktop, or any other MCP host
can use Fable — not just ZCode.

Register (any MCP client):
  { "mcpServers": { "fable": { "command": "python3",
      "args": ["<fable-root>/scripts/mcp_server.py"] } } }

Tools:
  fable_route      — routing plan for a task        (route.py)
  fable_search     — local corpus search            (search.js)
  fable_retrieve   — external fable retrieval       (retrieve.js)
  fable_boost      — full boost pipeline            (boost.py)
  fable_escalate   — escalation ladder verdict      (escalate.py)
  fable_report     — immersive HTML+PDF report      (report.py)
"""

import json
import os
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

TOOLS = [
    {"name": "fable_route", "description": "Routing plan: which fable engines this task needs",
     "inputSchema": {"type": "object", "properties": {
         "task": {"type": "string"}, "laya": {"type": "boolean"}},
         "required": ["task"]}},
    {"name": "fable_search", "description": "Search the local lesson corpus",
     "inputSchema": {"type": "object", "properties": {"task": {"type": "string"}},
                     "required": ["task"]}},
    {"name": "fable_retrieve", "description": "Retrieve agent sessions from all fable HF datasets",
     "inputSchema": {"type": "object", "properties": {"task": {"type": "string"},
                     "top": {"type": "integer"}}, "required": ["task"]}},
    {"name": "fable_boost", "description": "Full boost pipeline: retrieve + Laya triage + Headroom compression",
     "inputSchema": {"type": "object", "properties": {"task": {"type": "string"}},
                     "required": ["task"]}},
    {"name": "fable_escalate", "description": "Escalation ladder verdict for a blocker",
     "inputSchema": {"type": "object", "properties": {"blocker": {"type": "string"},
                     "options": {"type": "string"}}, "required": ["blocker"]}},
    {"name": "fable_report", "description": "Generate immersive HTML+PDF report for the latest scan of a target",
     "inputSchema": {"type": "object", "properties": {"target": {"type": "string"}},
                     "required": ["target"]}},
]


def run(cmd, timeout=900):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def handle(name, args):
    if name == "fable_route":
        cmd = [sys.executable, os.path.join(PLUGIN_ROOT, "scripts", "route.py"), args["task"]]
        if args.get("laya"):
            cmd.append("--laya")
        r = run(cmd)
        return r.stdout or r.stderr
    if name == "fable_search":
        return run(["node", os.path.join(PLUGIN_ROOT, "scripts", "search.js"), args["task"]]).stdout
    if name == "fable_retrieve":
        cmd = ["node", os.path.join(PLUGIN_ROOT, "scripts", "retrieve.js"), args["task"],
               "--top", str(args.get("top", 5))]
        return run(cmd, timeout=900).stdout
    if name == "fable_boost":
        return run([sys.executable, os.path.join(PLUGIN_ROOT, "scripts", "boost", "boost.py"),
                    "--task", args["task"]], timeout=1200).stdout
    if name == "fable_escalate":
        cmd = [sys.executable, os.path.join(PLUGIN_ROOT, "scripts", "escalate.py"),
               "--blocker", args["blocker"]]
        if args.get("options"):
            cmd += ["--options", args["options"]]
        r = run(cmd, timeout=600)
        return r.stdout or f"verdict: ESCALATE_TO_HUMAN (exit {r.returncode})"
    if name == "fable_report":
        r = run([sys.executable, os.path.join(PLUGIN_ROOT, "scripts", "report.py"), args["target"]])
        return r.stdout or r.stderr
    return json.dumps({"error": f"unknown tool {name}"})


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue
        method = req.get("method", "")
        rid = req.get("id")
        if method == "initialize":
            result = {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}},
                      "serverInfo": {"name": "fable-mcp", "version": "0.19.0"}}
        elif method == "tools/list":
            result = {"tools": TOOLS}
        elif method == "tools/call":
            params = req.get("params", {})
            out = handle(params.get("name", ""), params.get("arguments", {}))
            result = {"content": [{"type": "text", "text": str(out)[:100_000]}]}
        else:
            continue
        sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": rid, "result": result}) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()

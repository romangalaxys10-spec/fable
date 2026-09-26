#!/usr/bin/env python3
import asyncio, json, os, subprocess, sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SERVER = "/Users/d/Documents/Projects/Default Project/laya-mcp/laya_mcp_server.py"
PY = "/Users/d/.venvs/laya-mlx/bin/python"


async def main():
    params = StdioServerParameters(command=PY, args=[SERVER])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print("== initialize: OK ==")

            tools = await session.list_tools()
            names = [t.name for t in tools.tools]
            print("tools:", names)

            res = await session.call_tool(
                "laya_choose",
                {
                    "text": "Hello! I was double charged on my last invoice. Please refund $49. This is urgent, my bank called.",
                    "options": ["billing", "technical", "sales"],
                    "instruction": "Which department should this request be routed to?",
                },
            )
            print("\n== laya_choose ==")
            print(res.content[0].text)

            res = await session.call_tool(
                "laya_decide",
                {
                    "text": "Our CI pipeline broke overnight, widgets fail to compile on ARM runners.",
                    "questions": [
                        {"id": "dept", "type": "choice", "instructions": "Which team owns this?", "criteria": ["platform", "build", "data"]},
                        {"id": "sev", "type": "score", "instructions": "How severe is this for end users?", "criteria": ["noise", "impact", "blocker"]},
                        {"id": "blocking", "type": "noul", "instructions": "Does this block a release?", "criteria": {"false": "not currently", "true": "blocked delivery"}},
                    ],
                },
            )
            print("\n== laya_decide ==")
            print(res.content[0].text)

            res = await session.call_tool("laya_score", {"text": "the product is decent but onboarding felt clunky", "scale": ["poor", "ok", "great"]})
            print("\n== laya_score ==")
            print(res.content[0].text)

            res = await session.call_tool("laya_bool", {"text": "URGENT: account locked, user cannot login at all", "instruction": "Is this a critical issue needing immediate escalation?"})
            print("\n== laya_bool ==")
            print(res.content[0].text)

            try:
                await session.call_tool("laya_bool", {"text": "test", "instruction": "x", "bogus": 1})
            except Exception as e:
                print("\n== extra-field rejection ==", "OK" if "bogus" in str(e) else str(e))

            try:
                await session.call_tool("laya_choose", {"text": "x", "options": ["a"]})
            except Exception as e:
                print("\n== min-length rejection ==", "OK" if ("at least" in str(e) or "a" in str(e) and "option" in str(e)) else str(e))


asyncio.run(main())
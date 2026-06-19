# agents/run_all.py
import asyncio
import sys
import os

# Reconfigure stdout to support UTF-8 (and emojis) on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure the agents folder is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from vision_agent import main as vision_main
from routing_agent import main as routing_main
from watchdog_agent import main as watchdog_main
from verification_agent import main as verification_main

async def run_safely(coro, name):
    try:
        print(f"[Run All] Starting task: {name}")
        await coro
    except Exception as err:
        print(f"[Run All] Task {name} encountered an error and stopped: {err}")

async def run():
    print("[Run All] Starting all 4 Band agents concurrently...")
    await asyncio.gather(
        run_safely(vision_main(), "Vision Agent"),
        run_safely(routing_main(), "Routing Agent"),
        run_safely(watchdog_main(), "Watchdog Agent"),
        run_safely(verification_main(), "Verification Agent"),
    )

if __name__ == "__main__":
    asyncio.run(run())

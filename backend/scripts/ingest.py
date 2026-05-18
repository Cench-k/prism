"""CLI 진입점 — 로컬에서 한 번 실행할 때 사용.

사용:
    python -m scripts.ingest [--category crypto]
"""

from __future__ import annotations

import argparse
import asyncio
import logging

from app.services.ingest import run_ingest


async def _main(category: str | None) -> None:
    summary = await run_ingest(category)
    print(f"sources processed: {summary['sources']}")
    for r in summary["results"]:
        if "error" in r:
            print(f"  [error] {r['id']}: {r['error']}")
        else:
            print(f"  {r['id']}: inserted={r['inserted']} skipped={r['skipped']}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--category", default=None)
    args = parser.parse_args()
    asyncio.run(_main(args.category))

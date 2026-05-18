import httpx
from typing import Any

COIN_IDS = ["bitcoin", "ethereum", "dogecoin"]


async def fetch_crypto_tickers() -> list[dict[str, Any]]:
    """CoinGecko 공개 API에서 BTC/ETH/DOGE 시세를 가져옵니다."""
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {
        "ids": ",".join(COIN_IDS),
        "vs_currencies": "usd",
        "include_24hr_change": "true",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    return [
        {
            "symbol": coin.upper(),
            "price_usd": data.get(coin, {}).get("usd"),
            "change_24h_pct": data.get(coin, {}).get("usd_24h_change"),
        }
        for coin in COIN_IDS
    ]

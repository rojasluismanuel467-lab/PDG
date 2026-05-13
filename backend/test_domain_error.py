import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # I just need to verify what status code the API returns for the missing artifact or forbidden.
        pass

if __name__ == "__main__":
    pass

import asyncio, os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def main():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME") or os.getenv("MONGO_DB_NAME")]
    result = await db.users.update_many({}, {"$set": {"refresh_tokens": []}})
    print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")
    client.close()

asyncio.run(main())
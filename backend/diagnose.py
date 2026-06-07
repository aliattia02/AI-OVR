#!/usr/bin/env python3
"""
AI-OVR Backend Diagnostic Script
Run from the /backend directory:
    python diagnose.py

Tests each layer in order and tells you exactly where the failure is.
"""

import asyncio
import os
import sys
import time
import traceback

# ── Load .env so we use the same config as the app ───────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
    print("✅ .env loaded")
except ImportError:
    print("⚠️  python-dotenv not installed — using raw environment variables")

MONGO_URI  = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or os.getenv("DATABASE_URL")
DB_NAME    = os.getenv("DB_NAME") or os.getenv("MONGO_DB_NAME") or "ai_ovr"
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Environment
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("STEP 1 — Environment variables")
print("═" * 60)

if MONGO_URI:
    # Mask password in output
    safe_uri = MONGO_URI
    if "@" in MONGO_URI:
        prefix, rest = MONGO_URI.split("@", 1)
        if ":" in prefix.split("//")[-1]:
            user_part = prefix.rsplit(":", 1)[0]
            safe_uri  = f"{user_part}:****@{rest}"
    print(f"  MONGODB_URI : {safe_uri}")
else:
    print("  ❌ MONGODB_URI is NOT set — this is likely the problem!")
    print("     Check your backend/.env file.")

print(f"  DB_NAME     : {DB_NAME}")
print(f"  BACKEND_URL : {BACKEND_URL}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. DNS resolution for Atlas hosts
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("STEP 2 — DNS resolution (can we reach Atlas?)")
print("═" * 60)

if MONGO_URI and "mongodb+srv://" in MONGO_URI:
    import socket
    try:
        host = MONGO_URI.split("@")[-1].split("/")[0].split("?")[0]
        print(f"  Resolving: {host} …", end=" ", flush=True)
        start = time.time()
        ip = socket.gethostbyname(host)
        print(f"✅  {ip}  ({(time.time()-start)*1000:.0f} ms)")
    except socket.gaierror as e:
        print(f"\n  ❌ DNS failed: {e}")
        print("     → Check your internet connection or Atlas cluster hostname.")
elif MONGO_URI:
    print("  ℹ️  Not an Atlas SRV URI — skipping DNS check.")
else:
    print("  ⏭️  Skipped (no URI).")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Raw TCP connectivity to Atlas
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("STEP 3 — TCP port reachability")
print("═" * 60)

if MONGO_URI:
    import socket, ssl

    # Atlas uses port 27017 for SRV-resolved hosts
    test_host = None
    if "mongodb+srv://" in MONGO_URI:
        try:
            import dns.resolver  # pymongo ships this
            srvs = dns.resolver.resolve(f"_mongodb._tcp.{MONGO_URI.split('@')[-1].split('/')[0].split('?')[0]}", "SRV")
            test_host = str(srvs[0].target).rstrip(".")
            test_port = srvs[0].port
        except Exception:
            test_host = None

    if test_host:
        print(f"  Connecting to {test_host}:{test_port} …", end=" ", flush=True)
        try:
            start = time.time()
            sock = socket.create_connection((test_host, test_port), timeout=5)
            sock.close()
            print(f"✅  ({(time.time()-start)*1000:.0f} ms)")
        except Exception as e:
            print(f"\n  ❌ TCP failed: {e}")
            print("     → Your IP may not be in the Atlas Network Access allowlist.")
            print("       Go to: Atlas → Network Access → Add IP Address")
    else:
        print("  ⚠️  Could not resolve SRV — skipping TCP check.")
else:
    print("  ⏭️  Skipped (no URI).")

# ─────────────────────────────────────────────────────────────────────────────
# 4. MongoDB connection + auth
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("STEP 4 — MongoDB connection & authentication")
print("═" * 60)

async def test_mongo():
    if not MONGO_URI:
        print("  ⏭️  Skipped (no URI).")
        return False

    try:
        from motor.motor_asyncio import AsyncIOMotorClient
    except ImportError:
        print("  ❌ motor not installed — run: pip install motor")
        return False

    print("  Connecting (5 s timeout) …", end=" ", flush=True)
    try:
        client = AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000,
        )
        start = time.time()
        info = await client.server_info()
        elapsed = (time.time() - start) * 1000
        print(f"✅  MongoDB {info.get('version', '?')}  ({elapsed:.0f} ms)")
        client.close()
        return True
    except Exception as e:
        print(f"\n  ❌ {type(e).__name__}: {e}")
        if "Authentication failed" in str(e):
            print("     → Wrong username or password in MONGODB_URI.")
        elif "timed out" in str(e).lower() or "ServerSelectionTimeout" in type(e).__name__:
            print("     → Atlas can't be reached. Most likely cause:")
            print("       • Your IP is NOT in Atlas Network Access allowlist.")
            print("       • Go to: https://cloud.mongodb.com → Network Access → Add IP")
        elif "Name or service not known" in str(e) or "nodename nor servname" in str(e):
            print("     → DNS failure. Check your internet or the cluster hostname in MONGODB_URI.")
        return False

mongo_ok = asyncio.run(test_mongo())

# ─────────────────────────────────────────────────────────────────────────────
# 5. Database + collections
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("STEP 5 — Database & collection access")
print("═" * 60)

async def test_collections():
    if not MONGO_URI or not mongo_ok:
        print("  ⏭️  Skipped (no connection).")
        return

    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]

    try:
        collections = await db.list_collection_names()
        print(f"  ✅ Database '{DB_NAME}' — {len(collections)} collection(s):")
        for c in collections:
            count = await db[c].estimated_document_count()
            print(f"       • {c:<30} {count:>6} docs")
    except Exception as e:
        print(f"  ❌ {e}")
    finally:
        client.close()

asyncio.run(test_collections())

# ─────────────────────────────────────────────────────────────────────────────
# 6. FastAPI process — is it running?
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("STEP 6 — FastAPI process (is the backend up?)")
print("═" * 60)

try:
    import urllib.request, urllib.error
    url = f"{BACKEND_URL}/api/health"
    print(f"  GET {url} …", end=" ", flush=True)
    start = time.time()
    req  = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        body = resp.read().decode()
        print(f"✅  HTTP {resp.status}  ({(time.time()-start)*1000:.0f} ms)")
        print(f"     Response: {body[:200]}")
except urllib.error.URLError as e:
    reason = str(e.reason)
    print(f"\n  ❌ {reason}")
    if "Connection refused" in reason:
        print("     → Backend is NOT running. Start it with:")
        print("       cd backend && uvicorn app.main:app --reload --port 8000")
    elif "timed out" in reason.lower():
        print("     → Backend process exists but is hanging (likely waiting on DB).")
except Exception as e:
    print(f"\n  ❌ {e}")

# ─────────────────────────────────────────────────────────────────────────────
# 7. Auth refresh endpoint (the one that was timing out)
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("STEP 7 — /api/auth/refresh endpoint timing")
print("═" * 60)

try:
    import urllib.request, urllib.error
    url = f"{BACKEND_URL}/api/auth/refresh"
    print(f"  POST {url} …", end=" ", flush=True)
    start = time.time()
    req = urllib.request.Request(url, data=b"", method="POST",
                                  headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            elapsed = (time.time() - start) * 1000
            print(f"✅  HTTP {resp.status}  ({elapsed:.0f} ms)")
    except urllib.error.HTTPError as e:
        elapsed = (time.time() - start) * 1000
        if e.code == 401:
            print(f"✅  HTTP 401 — correct, no cookie sent  ({elapsed:.0f} ms)")
            print("     ✅ Endpoint is alive and responding quickly.")
        else:
            print(f"\n  ⚠️  HTTP {e.code}  ({elapsed:.0f} ms)")
except urllib.error.URLError as e:
    elapsed = (time.time() - start) * 1000
    if "timed out" in str(e).lower():
        print(f"\n  ❌ TIMED OUT after {elapsed:.0f} ms")
        print("     → The endpoint is hanging. Backend is likely stuck waiting on DB.")
    else:
        print(f"\n  ❌ {e}")
except Exception as e:
    print(f"\n  ❌ {e}")

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("DIAGNOSIS COMPLETE")
print("═" * 60)
print("""
Most common fixes based on the results above:

  ❌ MONGODB_URI not set    → add it to backend/.env
  ❌ DNS failed             → check cluster hostname / internet connection  
  ❌ TCP timeout            → add your IP to Atlas Network Access allowlist
  ❌ Auth failed            → fix username/password in MONGODB_URI
  ❌ Backend not running    → run: uvicorn app.main:app --reload --port 8000
  ❌ Refresh endpoint hangs → backend is running but DB connection is blocked
""")

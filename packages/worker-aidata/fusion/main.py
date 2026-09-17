from fastapi import FastAPI

app = FastAPI(title="Fusion Engine")

@app.get("/health")
async def health():
    return {"status": "ok"}

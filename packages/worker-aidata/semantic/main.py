from fastapi import FastAPI

app = FastAPI(title="Semantic Compiler")

@app.get("/health")
async def health():
    return {"status": "ok"}

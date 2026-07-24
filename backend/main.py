from fastapi import FastAPI

app = FastAPI(title="Watchtower API")


@app.get("/")
async def root():
    return {"status": "ok"}

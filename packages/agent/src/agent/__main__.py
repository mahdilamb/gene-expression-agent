import os


def main() -> None:
    import uvicorn

    uvicorn.run("agent.app:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))


if __name__ == "__main__":
    main()

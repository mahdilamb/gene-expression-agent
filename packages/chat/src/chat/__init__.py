def main() -> None:
    import sys
    from pathlib import Path

    import streamlit.web.cli as stcli

    sys.argv = [
        "streamlit",
        "run",
        str(Path(__file__).parent / "app.py"),
        "--server.address",
        "0.0.0.0",
        "--server.enableStaticServing",
        "true",
        "--client.toolbarMode",
        "minimal",
    ]
    stcli.main()

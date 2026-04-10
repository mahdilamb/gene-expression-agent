from unittest.mock import MagicMock, patch

import httpx
import pytest

from chat.sessions import load_session, new_session


@pytest.fixture(autouse=True)
def _mock_streamlit(monkeypatch: pytest.MonkeyPatch):
    """Mock st.query_params as a plain dict for all tests."""
    import chat.sessions as mod

    mock_st = MagicMock()
    mock_st.query_params = {}
    mock_st.session_state = {}
    monkeypatch.setattr(mod, "st", mock_st)
    return mock_st


def test_new_session_returns_uuid():
    sid = new_session()
    assert len(sid) == 36, "Expected a UUID string"
    assert "-" in sid, "Expected UUID format with dashes"


def test_new_session_sets_query_param(_mock_streamlit: MagicMock):
    sid = new_session()
    assert _mock_streamlit.query_params["session"] == sid, (
        "Expected session to be set in query params"
    )


def test_new_session_returns_unique_ids():
    s1 = new_session()
    s2 = new_session()
    assert s1 != s2, "Expected each call to generate a unique session ID"


@patch("chat.sessions.httpx.get")
def test_load_session_returns_messages(mock_get: MagicMock):
    messages = [{"role": "user", "content": "hello"}]
    mock_resp = MagicMock()
    mock_resp.json.return_value = messages
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp

    result = load_session("test-id")
    assert result == messages, "Expected messages from agent response"
    mock_get.assert_called_once()


@patch("chat.sessions.httpx.get")
def test_load_session_returns_empty_on_http_error(mock_get: MagicMock):
    mock_get.side_effect = httpx.HTTPError("connection failed")

    result = load_session("bad-id")
    assert result == [], "Expected empty list on HTTP error"


@patch("chat.sessions.httpx.get")
def test_load_session_returns_empty_on_404(mock_get: MagicMock):
    mock_resp = MagicMock()
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
        "not found",
        request=MagicMock(),
        response=MagicMock(status_code=404),
    )
    mock_get.return_value = mock_resp

    result = load_session("nonexistent")
    assert result == [], "Expected empty list on 404"


@patch("chat.sessions.httpx.get")
def test_load_session_calls_correct_url(mock_get: MagicMock):
    mock_resp = MagicMock()
    mock_resp.json.return_value = []
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp

    load_session("abc-123")
    url = mock_get.call_args[0][0]
    assert url.endswith("/sessions/abc-123"), "Expected URL to include session ID"

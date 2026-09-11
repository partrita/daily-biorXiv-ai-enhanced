"""Runtime configuration shared by the paper-enhancement job."""

from urllib.parse import urlparse


def build_chat_openai_kwargs(model_name: str, base_url: str, api_key: str) -> dict:
    """Build provider-safe ChatOpenAI settings from workflow configuration."""
    model_name = (model_name or "gemini-3.7-flash").strip()
    api_key = (api_key or "").strip()
    base_url = (base_url or "").strip().rstrip("/")

    # base_url이 명시되지 않았거나 비어있는 경우 Gemini 또는 OpenAI로 자동 설정
    if not base_url:
        if model_name.startswith("gemini") or api_key.startswith("AIza"):
            base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
        else:
            base_url = "https://api.openai.com/v1"

    missing = [
        name
        for name, value in (
            ("MODEL_NAME", model_name),
            ("OPENAI_BASE_URL", base_url),
            ("OPENAI_API_KEY", api_key),
        )
        if not value
    ]
    if missing:
        raise ValueError(f"Missing required configuration: {', '.join(missing)}")

    kwargs = {
        "model": model_name,
        "base_url": base_url,
        "api_key": api_key,
    }
    hostname = urlparse(base_url).hostname or ""
    if hostname.endswith("volces.com"):
        kwargs["extra_body"] = {"thinking": {"type": "disabled"}}
    return kwargs


def raise_if_processing_failed(errors: list[str]) -> None:
    """Make a failed AI batch fail the workflow instead of publishing placeholders."""
    if errors:
        raise RuntimeError(f"{len(errors)} paper(s) failed AI enhancement: {errors[0]}")

"""Pengujian endpoint metrik Prometheus."""

from httpx import AsyncClient

from app.config import get_settings

settings = get_settings()


async def test_metrics_endpoint_is_available_without_token_in_test(
    client: AsyncClient,
) -> None:
    response = await client.get("/api/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "sagara_http_requests_total" in response.text


async def test_metrics_requires_bearer_token_when_configured(
    client: AsyncClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "metrics_token", "t" * 32)

    unauthorized = await client.get("/api/metrics")
    assert unauthorized.status_code == 401

    authorized = await client.get(
        "/api/metrics",
        headers={"Authorization": f"Bearer {'t' * 32}"},
    )
    assert authorized.status_code == 200


async def test_metrics_use_route_template_and_bound_unmatched(
    client: AsyncClient,
) -> None:
    await client.get("/api/health")
    await client.get("/api/tidak-ada")

    response = await client.get("/api/metrics")
    body = response.text

    assert (
        'sagara_http_requests_total{method="GET",route="/api/health",status="200"}'
        in body
    )
    assert 'route="<unmatched>"' in body
    assert "/api/tidak-ada" not in body


async def test_metrics_can_be_disabled(
    client: AsyncClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "metrics_enabled", False)

    response = await client.get("/api/metrics")

    assert response.status_code == 404

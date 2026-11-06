"""Router utama API."""

from fastapi import APIRouter

from app.api.routes import (
    auth,
    customers,
    dashboard,
    health,
    materials,
    production_orders,
    products,
    reports,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(users.router)
api_router.include_router(customers.router)
api_router.include_router(products.router)
api_router.include_router(production_orders.router)
api_router.include_router(materials.router)
api_router.include_router(reports.router)

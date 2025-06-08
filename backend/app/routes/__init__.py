from app.routes.product_routes import product_router
from app.routes.products_routes import products_router
from app.routes.category_routes import category_router
from app.routes.home_routes import home_router
from app.routes.order_routes import order_router
from app.routes.group_buy_routes import group_buy_router
from app.routes.user_routes import user_router
from app.routes.gamification_routes import gamification_router
from app.routes.favorite_routes import favorite_router
from app.routes.chat_routes import chat_router
from app.routes.search_routes import search_router
from app.routes.auth import router as auth_router
from app.routes.user_address_routes import user_address_router
from app.routes.admin_routes import admin_router

def init_routes(app):
    app.include_router(auth_router)
    app.include_router(product_router)
    app.include_router(products_router)
    app.include_router(category_router)
    app.include_router(home_router)
    app.include_router(order_router)
    app.include_router(group_buy_router)
    app.include_router(user_router)
    app.include_router(gamification_router)
    app.include_router(favorite_router)
    app.include_router(chat_router)
    app.include_router(search_router)
    app.include_router(user_address_router)
    app.include_router(admin_router)

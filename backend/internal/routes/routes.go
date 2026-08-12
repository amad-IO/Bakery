package routes

import (
	"net/http"

	"kaya-bakery/internal/config"
	"kaya-bakery/internal/handlers"
	"kaya-bakery/internal/middleware"
	"kaya-bakery/internal/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetupRoutes registers all API routes and middleware
func SetupRoutes(r *gin.Engine, database *gorm.DB, cfg *config.Config) {
	v1 := r.Group("/api/v1")

	// ── Healthcheck ───────────────────────────────────────────────
	v1.GET("/health", func(c *gin.Context) {
		dbStatus := "disconnected"
		if database != nil {
			if sqlDB, err := database.DB(); err == nil && sqlDB.Ping() == nil {
				dbStatus = "connected"
			}
		}
		response.SuccessResponse(c, http.StatusOK, gin.H{
			"status":      "ok",
			"environment": cfg.Env,
			"database":    dbStatus,
		})
	})

	// ── Initialise Handlers ───────────────────────────────────────
	authHandler := handlers.NewAuthHandler(database, cfg)
	productHandler := handlers.NewProductHandler(database)
	categoryHandler := handlers.NewCategoryHandler(database)
	orderHandler := handlers.NewOrderHandler(database)
	userHandler := handlers.NewUserHandler(database)
	dashboardHandler := handlers.NewDashboardHandler(database)
	settingsHandler := handlers.NewSettingsHandler(database)
	logHandler := handlers.NewLogHandler(database)

	// ── Auth ──────────────────────────────────────────────────────
	auth := v1.Group("/auth")
	{
		auth.POST("/login", authHandler.Login)
		auth.GET("/me", middleware.RequireAuth(cfg), authHandler.GetMe)
	}

	// ── Public — Products & Categories ───────────────────────────
	v1.GET("/products", productHandler.ListProducts)
	v1.GET("/products/:slug", productHandler.GetProduct)
	v1.GET("/categories", categoryHandler.ListCategories)

	// ── Public — Orders (Guest Pre-order) ────────────────────────
	v1.POST("/orders", orderHandler.CreatePublicOrder)
	v1.POST("/orders/:id/pay_mock", orderHandler.MockPayOrder)
	v1.GET("/orders/:order_code", orderHandler.GetOrderByCode)

	// ── POS (kasir + admin) ───────────────────────────────────────
	pos := v1.Group("/pos", middleware.RequireAuth(cfg), middleware.RequireRole("kasir", "admin"))
	{
		pos.POST("/orders", orderHandler.CreatePOSOrder)
		pos.GET("/orders/scan/:order_code", orderHandler.ScanOrder)
		pos.PATCH("/orders/:id/status", orderHandler.UpdateOrderStatus)
		pos.POST("/orders/:id/payments", orderHandler.RecordPayment)
		pos.POST("/products", productHandler.CreateProduct)
		pos.PATCH("/products/:id/stock", productHandler.UpdateStock)
	}

	// ── Admin ─────────────────────────────────────────────────────
	admin := v1.Group("/admin", middleware.RequireAuth(cfg), middleware.RequireRole("admin"))
	{
		// Products
		admin.PATCH("/products/:id", productHandler.UpdateProduct)
		admin.DELETE("/products/:id", productHandler.DeleteProduct)

		// Categories
		admin.POST("/categories", categoryHandler.CreateCategory)
		admin.PATCH("/categories/:id", categoryHandler.UpdateCategory)
		admin.DELETE("/categories/:id", categoryHandler.DeleteCategory)

		// Users / Cashiers
		admin.GET("/users", userHandler.ListUsers)
		admin.POST("/users", userHandler.CreateUser)
		admin.PATCH("/users/:id", userHandler.UpdateUser)
		admin.DELETE("/users/:id", userHandler.DeactivateUser)

		// Orders
		admin.GET("/orders", orderHandler.ListAllOrders)

		// Dashboard Stats
		admin.GET("/dashboard/stats", dashboardHandler.GetStats)

		// Activity Logs
		admin.GET("/logs", logHandler.ListLogs)

		// Store Settings
		admin.GET("/settings", settingsHandler.GetSettings)
		admin.PATCH("/settings", settingsHandler.UpdateSettings)
	}
}

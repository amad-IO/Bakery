package main

import (
	"fmt"
	"log"
	"net/http"

	"kaya-bakery/internal/config"
	"kaya-bakery/internal/db"
	"kaya-bakery/internal/middleware"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load environment variables from .env if present
	if err := godotenv.Load(); err != nil {
		log.Println("INFO: No .env file found, using system environment variables")
	}

	// 2. Load configuration
	cfg := config.LoadConfig()

	// 3. Set Gin mode
	if cfg.Env == "production" || cfg.Env == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// 4. Initialize Database connection & AutoMigrate
	database, err := config.InitDB(cfg)
	if err != nil {
		log.Printf("WARNING: Failed to connect to database: %v", err)
	} else {
		log.Println("INFO: Database connection established successfully.")
		if err := db.AutoMigrate(database); err != nil {
			log.Printf("WARNING: AutoMigrate failed: %v", err)
		}
	}

	// 5. Setup Gin Router & Routes
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORSMiddleware(cfg))

	// 404 Handler
	r.NoRoute(func(c *gin.Context) {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Endpoint not found")
	})

	// Setup API routes
	routes.SetupRoutes(r, database, cfg)

	// 6. Start HTTP Server
	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("SUCCESS: KAYA Bakery API server running on port %s (env: %s)", cfg.Port, cfg.Env)

	if err := r.Run(serverAddr); err != nil && err != http.ErrServerClosed {
		log.Fatalf("FATAL: Failed to start server: %v", err)
	}
}

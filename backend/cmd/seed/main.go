package main

import (
	"log"

	"kaya-bakery/internal/config"
	"kaya-bakery/internal/db"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("INFO: No .env file found, using system environment variables")
	}

	cfg := config.LoadConfig()

	database, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("FATAL: Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(database); err != nil {
		log.Fatalf("FATAL: Migration failed: %v", err)
	}

	if err := db.SeedDB(database); err != nil {
		log.Fatalf("FATAL: Seeding failed: %v", err)
	}

	log.Println("SUCCESS: Admin seed execution finished successfully.")
}

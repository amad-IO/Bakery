package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port               string
	Env                string
	DatabaseURL        string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	DBSSLMode          string
	DBMaxOpenConns     int
	DBMaxIdleConns     int
	JWTSecret          string
	JWTExpiryHours     int
	CORSAllowedOrigins []string
}

func LoadConfig() *Config {
	port := getEnv("PORT", "8080")
	env := getEnv("APP_ENV", "development")

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "kaya_bakery")
	dbSSLMode := getEnv("DB_SSLMODE", "disable")

	dbURL := getEnv("DATABASE_URL", "")
	if dbURL == "" {
		dbURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
			dbUser, dbPassword, dbHost, dbPort, dbName, dbSSLMode)
	}

	maxOpen := getEnvAsInt("DB_MAX_OPEN_CONNS", 25)
	maxIdle := getEnvAsInt("DB_MAX_IDLE_CONNS", 10)

	jwtSecret := getEnv("JWT_SECRET", "kaya-bakery-secret-key-2026")
	jwtExpiry := getEnvAsInt("JWT_EXPIRY_HOURS", 24)

	originsRaw := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000")
	var origins []string
	for _, o := range strings.Split(originsRaw, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	return &Config{
		Port:               port,
		Env:                env,
		DatabaseURL:        dbURL,
		DBHost:             dbHost,
		DBPort:             dbPort,
		DBUser:             dbUser,
		DBPassword:         dbPassword,
		DBName:             dbName,
		DBSSLMode:          dbSSLMode,
		DBMaxOpenConns:     maxOpen,
		DBMaxIdleConns:     maxIdle,
		JWTSecret:          jwtSecret,
		JWTExpiryHours:     jwtExpiry,
		CORSAllowedOrigins: origins,
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	if valStr, ok := os.LookupEnv(key); ok && valStr != "" {
		if val, err := strconv.Atoi(valStr); err == nil {
			return val
		}
	}
	return fallback
}

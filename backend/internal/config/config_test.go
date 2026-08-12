package config

import (
	"os"
	"reflect"
	"testing"
)

func TestLoadConfig_Defaults(t *testing.T) {
	// Clear relevant env vars to test fallbacks
	envKeys := []string{
		"PORT", "APP_ENV", "DB_HOST", "DB_PORT", "DB_USER",
		"DB_PASSWORD", "DB_NAME", "DB_SSLMODE", "DATABASE_URL",
		"DB_MAX_OPEN_CONNS", "DB_MAX_IDLE_CONNS", "JWT_SECRET",
		"JWT_EXPIRY_HOURS", "CORS_ALLOWED_ORIGINS",
	}
	for _, key := range envKeys {
		os.Unsetenv(key)
	}

	cfg := LoadConfig()

	if cfg.Port != "8080" {
		t.Errorf("expected default Port '8080', got '%s'", cfg.Port)
	}
	if cfg.Env != "development" {
		t.Errorf("expected default Env 'development', got '%s'", cfg.Env)
	}
	if cfg.DBHost != "localhost" {
		t.Errorf("expected default DBHost 'localhost', got '%s'", cfg.DBHost)
	}
	if cfg.DBPort != "5432" {
		t.Errorf("expected default DBPort '5432', got '%s'", cfg.DBPort)
	}
	if cfg.DBUser != "postgres" {
		t.Errorf("expected default DBUser 'postgres', got '%s'", cfg.DBUser)
	}
	if cfg.DBPassword != "postgres" {
		t.Errorf("expected default DBPassword 'postgres', got '%s'", cfg.DBPassword)
	}
	if cfg.DBName != "kaya_bakery" {
		t.Errorf("expected default DBName 'kaya_bakery', got '%s'", cfg.DBName)
	}
	if cfg.DBSSLMode != "disable" {
		t.Errorf("expected default DBSSLMode 'disable', got '%s'", cfg.DBSSLMode)
	}
	expectedURL := "postgres://postgres:postgres@localhost:5432/kaya_bakery?sslmode=disable"
	if cfg.DatabaseURL != expectedURL {
		t.Errorf("expected constructed DatabaseURL '%s', got '%s'", expectedURL, cfg.DatabaseURL)
	}
	if cfg.DBMaxOpenConns != 25 {
		t.Errorf("expected default DBMaxOpenConns 25, got %d", cfg.DBMaxOpenConns)
	}
	if cfg.DBMaxIdleConns != 10 {
		t.Errorf("expected default DBMaxIdleConns 10, got %d", cfg.DBMaxIdleConns)
	}
	if cfg.JWTSecret != "kaya-bakery-secret-key-2026" {
		t.Errorf("expected default JWTSecret 'kaya-bakery-secret-key-2026', got '%s'", cfg.JWTSecret)
	}
	if cfg.JWTExpiryHours != 24 {
		t.Errorf("expected default JWTExpiryHours 24, got %d", cfg.JWTExpiryHours)
	}
	expectedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:3000",
	}
	if !reflect.DeepEqual(cfg.CORSAllowedOrigins, expectedOrigins) {
		t.Errorf("expected default CORSAllowedOrigins %v, got %v", expectedOrigins, cfg.CORSAllowedOrigins)
	}
}

func TestLoadConfig_CustomEnv(t *testing.T) {
	os.Setenv("PORT", "9090")
	os.Setenv("APP_ENV", "production")
	os.Setenv("DATABASE_URL", "postgres://custom:pass@remote:5432/custom_db?sslmode=require")
	os.Setenv("DB_MAX_OPEN_CONNS", "50")
	os.Setenv("DB_MAX_IDLE_CONNS", "20")
	os.Setenv("JWT_SECRET", "custom-secret-key")
	os.Setenv("JWT_EXPIRY_HOURS", "48")
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://kaya.id , https://admin.kaya.id, ")

	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("APP_ENV")
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("DB_MAX_OPEN_CONNS")
		os.Unsetenv("DB_MAX_IDLE_CONNS")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("JWT_EXPIRY_HOURS")
		os.Unsetenv("CORS_ALLOWED_ORIGINS")
	}()

	cfg := LoadConfig()

	if cfg.Port != "9090" {
		t.Errorf("expected Port '9090', got '%s'", cfg.Port)
	}
	if cfg.Env != "production" {
		t.Errorf("expected Env 'production', got '%s'", cfg.Env)
	}
	if cfg.DatabaseURL != "postgres://custom:pass@remote:5432/custom_db?sslmode=require" {
		t.Errorf("expected DatabaseURL 'postgres://custom:pass@remote:5432/custom_db?sslmode=require', got '%s'", cfg.DatabaseURL)
	}
	if cfg.DBMaxOpenConns != 50 {
		t.Errorf("expected DBMaxOpenConns 50, got %d", cfg.DBMaxOpenConns)
	}
	if cfg.DBMaxIdleConns != 20 {
		t.Errorf("expected DBMaxIdleConns 20, got %d", cfg.DBMaxIdleConns)
	}
	if cfg.JWTSecret != "custom-secret-key" {
		t.Errorf("expected JWTSecret 'custom-secret-key', got '%s'", cfg.JWTSecret)
	}
	if cfg.JWTExpiryHours != 48 {
		t.Errorf("expected JWTExpiryHours 48, got %d", cfg.JWTExpiryHours)
	}
	expectedOrigins := []string{"https://kaya.id", "https://admin.kaya.id"}
	if !reflect.DeepEqual(cfg.CORSAllowedOrigins, expectedOrigins) {
		t.Errorf("expected CORSAllowedOrigins %v, got %v", expectedOrigins, cfg.CORSAllowedOrigins)
	}
}

func TestLoadConfig_InvalidIntFallback(t *testing.T) {
	os.Setenv("DB_MAX_OPEN_CONNS", "invalid_int")
	os.Setenv("DB_MAX_IDLE_CONNS", "-not-a-number")
	os.Setenv("JWT_EXPIRY_HOURS", "abc")

	defer func() {
		os.Unsetenv("DB_MAX_OPEN_CONNS")
		os.Unsetenv("DB_MAX_IDLE_CONNS")
		os.Unsetenv("JWT_EXPIRY_HOURS")
	}()

	cfg := LoadConfig()

	if cfg.DBMaxOpenConns != 25 {
		t.Errorf("expected DBMaxOpenConns fallback 25 for invalid int, got %d", cfg.DBMaxOpenConns)
	}
	if cfg.DBMaxIdleConns != 10 {
		t.Errorf("expected DBMaxIdleConns fallback 10 for invalid int, got %d", cfg.DBMaxIdleConns)
	}
	if cfg.JWTExpiryHours != 24 {
		t.Errorf("expected JWTExpiryHours fallback 24 for invalid int, got %d", cfg.JWTExpiryHours)
	}
}

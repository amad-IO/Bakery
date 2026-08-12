package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"kaya-bakery/internal/config"
	"kaya-bakery/internal/middleware"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestAuthHandlerValidationAndErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := &config.Config{
		JWTSecret:      "test-secret-key-1234567890",
		JWTExpiryHours: 24,
	}
	handler := NewAuthHandler(nil, cfg)

	r := gin.New()
	r.POST("/api/v1/auth/login", handler.Login)
	r.GET("/api/v1/auth/me", middleware.RequireAuth(cfg), handler.GetMe)

	// 1. Invalid JSON body on login
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString("{invalid json}"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for malformed JSON login, got %d", w.Code)
	}

	var errResp response.ErrorEnvelope
	_ = json.Unmarshal(w.Body.Bytes(), &errResp)
	if errResp.Error.Code != "VALIDATION_ERROR" {
		t.Errorf("Expected code VALIDATION_ERROR, got %s", errResp.Error.Code)
	}

	// 2. Empty fields on login
	loginBody, _ := json.Marshal(map[string]string{"email": "", "password": ""})
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(loginBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for empty login fields, got %d", w.Code)
	}

	// 3. Login with nil DB -> Server error 500
	validBody, _ := json.Marshal(map[string]string{"email": "owner@kaya.id", "password": "rahasia123"})
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(validBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status 500 for nil DB login, got %d", w.Code)
	}

	// 4. GET /auth/me without auth header -> 401 Unauthorized
	req, _ = http.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 for unauthenticated GET /auth/me, got %d", w.Code)
	}

	// 5. GET /auth/me with valid JWT token (fallback mode without DB) -> 200 OK
	userID := uuid.New().String()
	token, err := utils.GenerateToken(userID, "owner@kaya.id", "admin", cfg.JWTSecret, 1)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	req, _ = http.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for valid token GET /auth/me, got %d", w.Code)
	}

	var succResp response.SuccessEnvelope
	_ = json.Unmarshal(w.Body.Bytes(), &succResp)
	if !succResp.Success {
		t.Errorf("Expected success response true, got false")
	}
}

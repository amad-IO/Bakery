package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"kaya-bakery/internal/config"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/utils"

	"github.com/gin-gonic/gin"
)

func setupTestRouter(cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery())

	// Protected test route
	r.GET("/protected", RequireAuth(cfg), func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		email, _ := c.Get("email")
		role, _ := c.Get("role")
		response.SuccessResponse(c, http.StatusOK, gin.H{
			"user_id": userID,
			"email":   email,
			"role":    role,
		})
	})

	// Admin only route
	r.GET("/admin-only", RequireAuth(cfg), RequireRole("admin"), func(c *gin.Context) {
		response.SuccessResponse(c, http.StatusOK, gin.H{"message": "admin access granted"})
	})

	// POS route (kasir or admin)
	r.GET("/pos-access", RequireAuth(cfg), RequireRole("kasir", "admin"), func(c *gin.Context) {
		response.SuccessResponse(c, http.StatusOK, gin.H{"message": "pos access granted"})
	})

	return r
}

func TestRequireAuth(t *testing.T) {
	cfg := &config.Config{
		JWTSecret:      "test-secret-32-chars-minimum-key",
		JWTExpiryHours: 24,
	}
	router := setupTestRouter(cfg)

	// 1. Missing Authorization header
	req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 for missing header, got %d", w.Code)
	}

	var errResp response.ErrorEnvelope
	_ = json.Unmarshal(w.Body.Bytes(), &errResp)
	if errResp.Error.Code != "UNAUTHORIZED" {
		t.Errorf("Expected error code UNAUTHORIZED, got %s", errResp.Error.Code)
	}

	// 2. Invalid Header Format
	req, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Basic invalidtoken")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 for invalid header format, got %d", w.Code)
	}

	// 3. Invalid Token String
	req, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid.jwt.string")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 for invalid token string, got %d", w.Code)
	}

	// 4. Valid Token
	validToken, err := utils.GenerateToken("user-123", "admin@kaya.id", "admin", cfg.JWTSecret, 1)
	if err != nil {
		t.Fatalf("Failed to generate test token: %v", err)
	}

	req, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+validToken)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for valid token, got %d", w.Code)
	}

	var succResp response.SuccessEnvelope
	_ = json.Unmarshal(w.Body.Bytes(), &succResp)
	dataMap, ok := succResp.Data.(map[string]interface{})
	if !ok || dataMap["user_id"] != "user-123" || dataMap["email"] != "admin@kaya.id" || dataMap["role"] != "admin" {
		t.Errorf("Unexpected context data in response: %v", succResp.Data)
	}
}

func TestRequireRole(t *testing.T) {
	cfg := &config.Config{
		JWTSecret:      "test-secret-32-chars-minimum-key",
		JWTExpiryHours: 24,
	}
	router := setupTestRouter(cfg)

	adminToken, _ := utils.GenerateToken("admin-uuid", "admin@kaya.id", "admin", cfg.JWTSecret, 1)
	kasirToken, _ := utils.GenerateToken("kasir-uuid", "kasir@kaya.id", "kasir", cfg.JWTSecret, 1)

	// Admin accesses admin-only route -> 200 OK
	req, _ := http.NewRequest(http.MethodGet, "/admin-only", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for admin on admin-only route, got %d", w.Code)
	}

	// Kasir accesses admin-only route -> 403 Forbidden
	req, _ = http.NewRequest(http.MethodGet, "/admin-only", nil)
	req.Header.Set("Authorization", "Bearer "+kasirToken)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403 for kasir on admin-only route, got %d", w.Code)
	}

	var errResp response.ErrorEnvelope
	_ = json.Unmarshal(w.Body.Bytes(), &errResp)
	if errResp.Error.Code != "FORBIDDEN" || errResp.Error.Message != "Akses ditolak" {
		t.Errorf("Expected FORBIDDEN with message 'Akses ditolak', got code=%s message=%s", errResp.Error.Code, errResp.Error.Message)
	}

	// Kasir accesses pos-access route -> 200 OK
	req, _ = http.NewRequest(http.MethodGet, "/pos-access", nil)
	req.Header.Set("Authorization", "Bearer "+kasirToken)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for kasir on pos-access route, got %d", w.Code)
	}

	// Admin accesses pos-access route -> 200 OK
	req, _ = http.NewRequest(http.MethodGet, "/pos-access", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for admin on pos-access route, got %d", w.Code)
	}
}

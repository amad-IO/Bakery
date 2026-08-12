package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"kaya-bakery/internal/config"
	"kaya-bakery/internal/response"

	"github.com/gin-gonic/gin"
)

func TestSetupRoutesHealthcheck(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := &config.Config{
		Env:       "development",
		JWTSecret: "secret-key",
	}

	r := gin.New()
	SetupRoutes(r, nil, cfg)

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp response.SuccessEnvelope
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if !resp.Success {
		t.Errorf("Expected success true")
	}
}

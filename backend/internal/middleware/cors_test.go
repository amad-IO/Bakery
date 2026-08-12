package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"kaya-bakery/internal/config"

	"github.com/gin-gonic/gin"
)

func TestCORSMiddleware_EdgeCases(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		CORSAllowedOrigins: []string{"http://localhost:5173", "http://localhost:3000"},
	}

	r := gin.New()
	r.Use(CORSMiddleware(cfg))
	r.GET("/api/v1/test", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	t.Run("Allowed Origin Request", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/test", nil)
		req.Header.Set("Origin", "http://localhost:5173")

		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "http://localhost:5173" {
			t.Fatalf("expected Access-Control-Allow-Origin 'http://localhost:5173', got '%s'", origin)
		}
		if creds := w.Header().Get("Access-Control-Allow-Credentials"); creds != "true" {
			t.Fatalf("expected Access-Control-Allow-Credentials 'true', got '%s'", creds)
		}
	})

	t.Run("Unallowed Origin Request", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/test", nil)
		req.Header.Set("Origin", "http://evil-attacker.com")

		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "" {
			t.Fatalf("expected empty Access-Control-Allow-Origin for unallowed origin, got '%s'", origin)
		}
		if creds := w.Header().Get("Access-Control-Allow-Credentials"); creds != "" {
			t.Fatalf("expected empty Access-Control-Allow-Credentials for unallowed origin, got '%s'", creds)
		}
	})

	t.Run("Empty Origin Request (Server-to-Server / Curl)", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/test", nil)
		// No Origin header set

		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "*" {
			t.Fatalf("expected Access-Control-Allow-Origin '*' for empty origin, got '%s'", origin)
		}
		if creds := w.Header().Get("Access-Control-Allow-Credentials"); creds != "true" {
			t.Fatalf("expected Access-Control-Allow-Credentials 'true', got '%s'", creds)
		}
	})

	t.Run("Wildcard Origin Config", func(t *testing.T) {
		wildcardCfg := &config.Config{
			CORSAllowedOrigins: []string{"*"},
		}
		wildcardApp := gin.New()
		wildcardApp.Use(CORSMiddleware(wildcardCfg))
		wildcardApp.GET("/api/v1/test", func(c *gin.Context) {
			c.String(http.StatusOK, "ok")
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/test", nil)
		req.Header.Set("Origin", "http://any-domain.com")

		wildcardApp.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "http://any-domain.com" {
			t.Fatalf("expected Access-Control-Allow-Origin 'http://any-domain.com', got '%s'", origin)
		}
	})

	t.Run("Options Preflight Request (Allowed)", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("OPTIONS", "/api/v1/test", nil)
		req.Header.Set("Origin", "http://localhost:5173")

		r.ServeHTTP(w, req)

		if w.Code != http.StatusNoContent {
			t.Fatalf("expected status 204 No Content for OPTIONS, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "http://localhost:5173" {
			t.Fatalf("expected Access-Control-Allow-Origin 'http://localhost:5173', got '%s'", origin)
		}
		if maxAge := w.Header().Get("Access-Control-Max-Age"); maxAge != "86400" {
			t.Fatalf("expected Access-Control-Max-Age '86400', got '%s'", maxAge)
		}
	})

	t.Run("Options Preflight Request (Unallowed)", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("OPTIONS", "/api/v1/test", nil)
		req.Header.Set("Origin", "http://evil-attacker.com")

		r.ServeHTTP(w, req)

		if w.Code != http.StatusNoContent {
			t.Fatalf("expected status 204 No Content for OPTIONS, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "" {
			t.Fatalf("expected empty Access-Control-Allow-Origin for unallowed origin OPTIONS, got '%s'", origin)
		}
	})
}

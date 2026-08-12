package services

import (
	"net/http/httptest"
	"testing"

	"kaya-bakery/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestLogActivityNilDB(t *testing.T) {
	userID := uuid.New()
	entityID := uuid.New()
	err := LogActivity(nil, userID, "LOGIN", "user", entityID, models.JSONMap{"ip": "127.0.0.1"})
	if err == nil {
		t.Errorf("Expected error when DB is nil, got nil")
	}
}

func TestLogActivityFromContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Test missing user_id in context
	err := LogActivityFromContext(c, nil, "LOGIN", "user", uuid.Nil, nil)
	if err == nil || err.Error() != "user_id not found in context" {
		t.Errorf("Expected 'user_id not found in context' error, got %v", err)
	}

	// Test valid UUID in context with nil DB (should fail DB check after successfully parsing context)
	validUUID := uuid.New()
	c.Set("user_id", validUUID)
	err = LogActivityFromContext(c, nil, "LOGIN", "user", uuid.Nil, nil)
	if err != ErrNilDB {
		t.Errorf("Expected ErrNilDB error, got %v", err)
	}

	// Test valid string UUID in context with nil DB
	c.Set("user_id", validUUID.String())
	err = LogActivityFromContext(c, nil, "LOGIN", "user", uuid.Nil, nil)
	if err != ErrNilDB {
		t.Errorf("Expected ErrNilDB error, got %v", err)
	}

	// Test invalid string UUID in context
	c.Set("user_id", "invalid-uuid-format")
	err = LogActivityFromContext(c, nil, "LOGIN", "user", uuid.Nil, nil)
	if err == nil {
		t.Errorf("Expected error for invalid UUID string in context, got nil")
	}
}

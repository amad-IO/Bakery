package services

import (
	"errors"
	"fmt"

	"kaya-bakery/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrNilDB = errors.New("database connection is nil")
)

// LogActivity inserts a new record into activity_logs table
func LogActivity(db *gorm.DB, userID uuid.UUID, action string, entityType string, entityID uuid.UUID, metadata models.JSONMap) error {
	if db == nil {
		return ErrNilDB
	}

	if metadata == nil {
		metadata = make(models.JSONMap)
	}

	logEntry := models.ActivityLog{
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Metadata:   metadata,
	}

	if err := db.Create(&logEntry).Error; err != nil {
		return fmt.Errorf("failed to log activity: %w", err)
	}

	return nil
}

// LogActivityFromContext extracts user_id from Gin context and calls LogActivity
func LogActivityFromContext(c *gin.Context, db *gorm.DB, action string, entityType string, entityID uuid.UUID, metadata models.JSONMap) error {
	val, exists := c.Get("user_id")
	if !exists {
		return errors.New("user_id not found in context")
	}

	var userID uuid.UUID
	switch v := val.(type) {
	case uuid.UUID:
		userID = v
	case string:
		parsed, err := uuid.Parse(v)
		if err != nil {
			return fmt.Errorf("invalid user_id format in context: %w", err)
		}
		userID = parsed
	default:
		return errors.New("unsupported user_id type in context")
	}

	return LogActivity(db, userID, action, entityType, entityID, metadata)
}

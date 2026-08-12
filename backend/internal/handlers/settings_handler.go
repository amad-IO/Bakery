package handlers

import (
	"net/http"

	"kaya-bakery/internal/models"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SettingsHandler struct {
	db *gorm.DB
}

func NewSettingsHandler(db *gorm.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

// GET /admin/settings
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	var settings []models.StoreSettings
	if err := h.db.Find(&settings).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch settings")
		return
	}

	// Convert to key-value map
	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	response.SuccessResponse(c, http.StatusOK, result)
}

// PATCH /admin/settings
func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	for key, value := range req {
		var setting models.StoreSettings
		result := h.db.Where("key = ?", key).First(&setting)
		if result.Error == gorm.ErrRecordNotFound {
			// Create
			setting = models.StoreSettings{Key: key, Value: value}
			h.db.Create(&setting)
		} else {
			// Update
			h.db.Model(&setting).Update("value", value)
		}
	}

	_ = services.LogActivityFromContext(c, h.db, "updated_settings", "store_settings", models.StoreSettings{}.ID, models.JSONMap{"keys": req})

	// Return updated settings
	var settings []models.StoreSettings
	h.db.Find(&settings)
	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	response.SuccessResponse(c, http.StatusOK, result)
}

package handlers

import (
	"net/http"
	"strconv"

	"kaya-bakery/internal/models"
	"kaya-bakery/internal/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LogHandler struct {
	db *gorm.DB
}

func NewLogHandler(db *gorm.DB) *LogHandler {
	return &LogHandler{db: db}
}

// GET /admin/logs
func (h *LogHandler) ListLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	q := h.db.Model(&models.ActivityLog{}).Preload("User", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name, email, role")
	})

	if userID := c.Query("user_id"); userID != "" {
		q = q.Where("user_id = ?", userID)
	}
	if action := c.Query("action"); action != "" {
		q = q.Where("action ILIKE ?", "%"+action+"%")
	}
	if from := c.Query("date_from"); from != "" {
		q = q.Where("created_at >= ?", from)
	}
	if to := c.Query("date_to"); to != "" {
		q = q.Where("created_at <= ?", to)
	}

	var total int64
	q.Count(&total)

	var logs []models.ActivityLog
	if err := q.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch logs")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
		"meta":    gin.H{"page": page, "limit": limit, "total": total},
	})
}

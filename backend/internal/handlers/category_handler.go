package handlers

import (
	"fmt"
	"net/http"

	"kaya-bakery/internal/models"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CategoryHandler struct {
	db *gorm.DB
}

func NewCategoryHandler(db *gorm.DB) *CategoryHandler {
	return &CategoryHandler{db: db}
}

// GET /categories — public
func (h *CategoryHandler) ListCategories(c *gin.Context) {
	var categories []models.Category
	if err := h.db.Order("display_order ASC, name ASC").Find(&categories).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch categories")
		return
	}
	response.SuccessResponse(c, http.StatusOK, categories)
}

// POST /admin/categories
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var req struct {
		Name         string `json:"name" binding:"required"`
		DisplayOrder int    `json:"display_order"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	slug := generateSlug(req.Name)
	var count int64
	h.db.Model(&models.Category{}).Where("slug LIKE ?", slug+"%").Count(&count)
	if count > 0 {
		slug = fmt.Sprintf("%s-%d", slug, count)
	}

	category := models.Category{
		Name:         req.Name,
		Slug:         slug,
		DisplayOrder: req.DisplayOrder,
	}
	if err := h.db.Create(&category).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to create category")
		return
	}

	_ = services.LogActivityFromContext(c, h.db, "created_category", "category", category.ID, models.JSONMap{"name": category.Name})
	response.SuccessResponse(c, http.StatusCreated, category)
}

// PATCH /admin/categories/:id
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid category ID")
		return
	}

	var category models.Category
	if err := h.db.First(&category, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Category not found")
		return
	}

	var req struct {
		Name         *string `json:"name"`
		DisplayOrder *int    `json:"display_order"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
		updates["slug"] = generateSlug(*req.Name)
	}
	if req.DisplayOrder != nil {
		updates["display_order"] = *req.DisplayOrder
	}

	if err := h.db.Model(&category).Updates(updates).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to update category")
		return
	}

	_ = services.LogActivityFromContext(c, h.db, "updated_category", "category", id, models.JSONMap{"updates": updates})
	response.SuccessResponse(c, http.StatusOK, category)
}

// DELETE /admin/categories/:id
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid category ID")
		return
	}

	var count int64
	h.db.Model(&models.Product{}).Where("category_id = ?", id).Count(&count)
	if count > 0 {
		response.ErrorResponse(c, http.StatusConflict, "CONFLICT", "Cannot delete category that has products")
		return
	}

	if err := h.db.Delete(&models.Category{}, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to delete category")
		return
	}

	_ = services.LogActivityFromContext(c, h.db, "deleted_category", "category", id, models.JSONMap{})
	response.SuccessResponse(c, http.StatusOK, gin.H{"message": "Category deleted"})
}

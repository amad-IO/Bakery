package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kaya-bakery/internal/models"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductHandler struct {
	db *gorm.DB
}

func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{db: db}
}

// generateSlug turns a name into a URL-friendly slug
func generateSlug(name string) string {
	s := strings.ToLower(name)
	s = strings.ReplaceAll(s, " ", "-")
	// remove non-alphanumeric except dash
	var result strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	return result.String()
}

func generateSKU() string {
	return fmt.Sprintf("SKU-%04d-%s", rand.Intn(9000)+1000, time.Now().Format("0601"))
}

// ─── Public ───────────────────────────────────────────────────

// GET /products
func (h *ProductHandler) ListProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	q := h.db.Model(&models.Product{}).Preload("Category")

	if cat := c.Query("category"); cat != "" {
		q = q.Joins("JOIN categories ON categories.id = products.category_id").
			Where("categories.slug = ?", cat)
	}
	if search := c.Query("search"); search != "" {
		q = q.Where("products.name ILIKE ?", "%"+search+"%")
	}
	if avail := c.Query("available"); avail == "true" {
		q = q.Where("products.is_available = ?", true)
	}

	var total int64
	q.Count(&total)

	var products []models.Product
	if err := q.Offset(offset).Limit(limit).Find(&products).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch products")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    products,
		"meta":    gin.H{"page": page, "limit": limit, "total": total},
	})
}

// GET /products/:slug
func (h *ProductHandler) GetProduct(c *gin.Context) {
	slug := c.Param("slug")
	var product models.Product
	if err := h.db.Preload("Category").Where("slug = ?", slug).First(&product).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Product not found")
			return
		}
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch product")
		return
	}
	response.SuccessResponse(c, http.StatusOK, product)
}

// ─── POS (kasir + admin) ──────────────────────────────────────

// POST /pos/products
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req struct {
		Name        string    `json:"name" binding:"required"`
		CategoryID  uuid.UUID `json:"category_id" binding:"required"`
		Price       float64   `json:"price" binding:"required,gt=0"`
		Description string    `json:"description"`
		ImageURL    string    `json:"image_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	slug := generateSlug(req.Name)
	// ensure slug unique
	var count int64
	h.db.Model(&models.Product{}).Where("slug LIKE ?", slug+"%").Count(&count)
	if count > 0 {
		slug = fmt.Sprintf("%s-%d", slug, count)
	}

	sku := generateSKU()

	userIDStr, _ := c.Get("user_id")
	userID, _ := uuid.Parse(fmt.Sprintf("%v", userIDStr))

	product := models.Product{
		CategoryID:  req.CategoryID,
		CreatedByID: userID,
		Name:        req.Name,
		Slug:        slug,
		Description: req.Description,
		SKU:         sku,
		Price:       req.Price,
		StockQty:    0,
		IsAvailable: true,
		ImageURL:    req.ImageURL,
	}

	if err := h.db.Create(&product).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to create product")
		return
	}

	_ = services.LogActivityFromContext(c, h.db, "created_product", "product", product.ID, models.JSONMap{"name": product.Name})

	h.db.Preload("Category").First(&product, product.ID)
	response.SuccessResponse(c, http.StatusCreated, product)
}

// PATCH /pos/products/:id/stock
func (h *ProductHandler) UpdateStock(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid product ID")
		return
	}

	var req struct {
		Qty  int    `json:"qty" binding:"required,gt=0"`
		Note string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "qty must be a positive integer")
		return
	}

	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Product not found")
		return
	}

	userIDStr, _ := c.Get("user_id")
	userID, _ := uuid.Parse(fmt.Sprintf("%v", userIDStr))

	// Update stock
	if err := h.db.Model(&product).Update("stock_qty", gorm.Expr("stock_qty + ?", req.Qty)).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to update stock")
		return
	}

	// Insert stock movement
	movement := models.StockMovement{
		ProductID:   id,
		Type:        models.StockMovementIn,
		Qty:         req.Qty,
		Note:        req.Note,
		CreatedByID: userID,
	}
	h.db.Create(&movement)

	_ = services.LogActivityFromContext(c, h.db, "updated_stock", "product", id, models.JSONMap{"qty_added": req.Qty, "note": req.Note})

	h.db.First(&product, id)
	response.SuccessResponse(c, http.StatusOK, product)
}

// ─── Admin ────────────────────────────────────────────────────

// PATCH /admin/products/:id
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid product ID")
		return
	}

	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Product not found")
		return
	}

	var req struct {
		Name        *string    `json:"name"`
		CategoryID  *uuid.UUID `json:"category_id"`
		Price       *float64   `json:"price"`
		Description *string    `json:"description"`
		ImageURL    *string    `json:"image_url"`
		IsAvailable *bool      `json:"is_available"`
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
	if req.CategoryID != nil {
		updates["category_id"] = *req.CategoryID
	}
	if req.Price != nil {
		updates["price"] = *req.Price
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.IsAvailable != nil {
		updates["is_available"] = *req.IsAvailable
	}

	if err := h.db.Model(&product).Updates(updates).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to update product")
		return
	}

	_ = services.LogActivityFromContext(c, h.db, "updated_product", "product", id, models.JSONMap{"updates": updates})

	h.db.Preload("Category").First(&product, id)
	response.SuccessResponse(c, http.StatusOK, product)
}

// DELETE /admin/products/:id  (soft delete via GORM DeletedAt)
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid product ID")
		return
	}

	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Product not found")
		return
	}

	if err := h.db.Delete(&product).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to delete product")
		return
	}

	_ = services.LogActivityFromContext(c, h.db, "deleted_product", "product", id, models.JSONMap{"name": product.Name})

	response.SuccessResponse(c, http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

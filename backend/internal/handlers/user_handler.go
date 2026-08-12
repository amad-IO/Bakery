package handlers

import (
	"fmt"
	"net/http"

	"kaya-bakery/internal/models"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/services"
	"kaya-bakery/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

// GET /admin/users?role=kasir
func (h *UserHandler) ListUsers(c *gin.Context) {
	q := h.db.Model(&models.User{})
	if role := c.Query("role"); role != "" {
		q = q.Where("role = ?", role)
	}
	var users []models.User
	if err := q.Order("created_at DESC").Find(&users).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch users")
		return
	}
	response.SuccessResponse(c, http.StatusOK, users)
}

// POST /admin/users — create cashier
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Phone    string `json:"phone"`
		Password string `json:"password" binding:"required,min=6"`
		Role     string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	// Check email unique
	var count int64
	h.db.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		response.ErrorResponse(c, http.StatusConflict, "CONFLICT", "Email already in use")
		return
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to hash password")
		return
	}

	role := models.RoleKasir
	if req.Role == "admin" {
		role = models.RoleAdmin
	}

	user := models.User{
		Name:         req.Name,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: hash,
		Role:         role,
		IsActive:     true,
	}

	if err := h.db.Create(&user).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to create user")
		return
	}

	_ = services.LogActivityFromContext(c, h.db, "created_user", "user", user.ID, models.JSONMap{
		"email": user.Email, "role": user.Role,
	})

	response.SuccessResponse(c, http.StatusCreated, UserResponse{
		ID: user.ID, Name: user.Name, Email: user.Email,
		Phone: user.Phone, Role: user.Role, IsActive: user.IsActive,
	})
}

// PATCH /admin/users/:id
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid user ID")
		return
	}

	var user models.User
	if err := h.db.First(&user, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "User not found")
		return
	}

	var req struct {
		Name     *string `json:"name"`
		Phone    *string `json:"phone"`
		IsActive *bool   `json:"is_active"`
		Password *string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Password != nil && *req.Password != "" {
		hash, err := utils.HashPassword(*req.Password)
		if err != nil {
			response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to hash password")
			return
		}
		updates["password_hash"] = hash
	}

	if err := h.db.Model(&user).Updates(updates).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to update user")
		return
	}

	_ = services.LogActivityFromContext(c, h.db, "updated_user", "user", id, models.JSONMap{"updates": fmt.Sprintf("%v", updates)})

	h.db.First(&user, id)
	response.SuccessResponse(c, http.StatusOK, UserResponse{
		ID: user.ID, Name: user.Name, Email: user.Email,
		Phone: user.Phone, Role: user.Role, IsActive: user.IsActive,
	})
}

// DELETE /admin/users/:id — soft deactivate
func (h *UserHandler) DeactivateUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid user ID")
		return
	}

	var user models.User
	if err := h.db.First(&user, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "User not found")
		return
	}

	h.db.Model(&user).Update("is_active", false)

	_ = services.LogActivityFromContext(c, h.db, "deactivated_user", "user", id, models.JSONMap{"email": user.Email})

	response.SuccessResponse(c, http.StatusOK, gin.H{"message": "User deactivated"})
}

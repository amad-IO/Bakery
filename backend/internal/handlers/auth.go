package handlers

import (
	"net/http"

	"kaya-bakery/internal/config"
	"kaya-bakery/internal/models"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/services"
	"kaya-bakery/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthHandler(db *gorm.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		db:  db,
		cfg: cfg,
	}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID       uuid.UUID       `json:"id"`
	Name     string          `json:"name"`
	Email    string          `json:"email"`
	Phone    string          `json:"phone,omitempty"`
	Role     models.UserRole `json:"role"`
	IsActive bool            `json:"is_active"`
}

type LoginResponseData struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

// Login handles POST /auth/login for Admin and Cashier accounts
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Email and password are required")
		return
	}

	if h.db == nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Database unavailable")
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid email or password")
			return
		}
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to query user")
		return
	}

	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		response.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid email or password")
		return
	}

	if !user.IsActive {
		response.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "User account is inactive")
		return
	}

	token, err := utils.GenerateToken(user.ID.String(), user.Email, string(user.Role), h.cfg.JWTSecret, h.cfg.JWTExpiryHours)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to generate authentication token")
		return
	}

	// Log activity
	_ = services.LogActivity(h.db, user.ID, "LOGIN", "user", user.ID, models.JSONMap{"email": user.Email})

	userResp := UserResponse{
		ID:       user.ID,
		Name:     user.Name,
		Email:    user.Email,
		Phone:    user.Phone,
		Role:     user.Role,
		IsActive: user.IsActive,
	}

	response.SuccessResponse(c, http.StatusOK, LoginResponseData{
		Token: token,
		User:  userResp,
	})
}

// GetMe handles GET /auth/me to return current user info from JWT context
func (h *AuthHandler) GetMe(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		response.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userIDStr, ok := userIDVal.(string)
	if !ok {
		response.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user context")
		return
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid user ID format")
		return
	}

	if h.db != nil {
		var user models.User
		if err := h.db.Where("id = ?", userUUID).First(&user).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "User not found")
				return
			}
			response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch user profile")
			return
		}

		userResp := UserResponse{
			ID:       user.ID,
			Name:     user.Name,
			Email:    user.Email,
			Phone:    user.Phone,
			Role:     user.Role,
			IsActive: user.IsActive,
		}

		response.SuccessResponse(c, http.StatusOK, userResp)
		return
	}

	// Fallback if DB is nil (e.g. in standalone context testing)
	emailStr, _ := c.Get("email")
	roleStr, _ := c.Get("role")
	response.SuccessResponse(c, http.StatusOK, gin.H{
		"id":        userUUID,
		"email":     emailStr,
		"role":      roleStr,
		"is_active": true,
	})
}

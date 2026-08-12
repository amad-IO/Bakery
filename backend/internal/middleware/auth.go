package middleware

import (
	"net/http"
	"strings"

	"kaya-bakery/internal/config"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/utils"

	"github.com/gin-gonic/gin"
)

// RequireAuth middleware verifies JWT token in Authorization: Bearer <token> header
func RequireAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authorization token required")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			response.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := strings.TrimSpace(parts[1])
		if tokenString == "" {
			response.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Token string is empty")
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(tokenString, cfg.JWTSecret)
		if err != nil {
			response.ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired token")
			c.Abort()
			return
		}

		// Inject user context into Gin
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next()
	}
}

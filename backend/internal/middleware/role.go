package middleware

import (
	"net/http"

	"kaya-bakery/internal/response"

	"github.com/gin-gonic/gin"
)

// RequireRole middleware enforces that the authenticated user has one of the allowed roles
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role")
		if !exists {
			response.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Akses ditolak")
			c.Abort()
			return
		}

		userRole, ok := roleVal.(string)
		if !ok {
			response.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Akses ditolak")
			c.Abort()
			return
		}

		for _, allowed := range allowedRoles {
			if userRole == allowed {
				c.Next()
				return
			}
		}

		response.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", "Akses ditolak")
		c.Abort()
	}
}

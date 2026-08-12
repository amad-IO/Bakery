package response

import (
	"github.com/gin-gonic/gin"
)

type Meta struct {
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Total int64 `json:"total"`
}

type SuccessEnvelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    *Meta       `json:"meta,omitempty"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorEnvelope struct {
	Success bool        `json:"success"`
	Error   ErrorDetail `json:"error"`
}

// SuccessResponse sends a standard successful JSON response with a data payload
func SuccessResponse(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, SuccessEnvelope{
		Success: true,
		Data:    data,
	})
}

// PaginatedResponse sends a standard successful JSON response with data and pagination metadata
func PaginatedResponse(c *gin.Context, statusCode int, data interface{}, page, limit int, total int64) {
	c.JSON(statusCode, SuccessEnvelope{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}

// ErrorResponse sends a standard error JSON response with error code and message
func ErrorResponse(c *gin.Context, statusCode int, code string, message string) {
	c.JSON(statusCode, ErrorEnvelope{
		Success: false,
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

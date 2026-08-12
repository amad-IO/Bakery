package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestResponseHelpers(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("SuccessResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		SuccessResponse(c, http.StatusOK, gin.H{"foo": "bar"})

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", w.Code)
		}

		var res SuccessEnvelope
		if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
			t.Fatalf("failed to parse JSON: %v", err)
		}

		if !res.Success {
			t.Fatalf("expected success: true")
		}
	})

	t.Run("PaginatedResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		items := []string{"item1", "item2"}
		PaginatedResponse(c, http.StatusOK, items, 1, 10, 2)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", w.Code)
		}

		var res SuccessEnvelope
		if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
			t.Fatalf("failed to parse JSON: %v", err)
		}

		if !res.Success || res.Meta == nil {
			t.Fatalf("expected meta field in paginated response")
		}
		if res.Meta.Page != 1 || res.Meta.Limit != 10 || res.Meta.Total != 2 {
			t.Fatalf("unexpected meta values: %+v", res.Meta)
		}
	})

	t.Run("ErrorResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid parameters")

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got %d", w.Code)
		}

		var res ErrorEnvelope
		if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
			t.Fatalf("failed to parse JSON: %v", err)
		}

		if res.Success {
			t.Fatalf("expected success: false")
		}
		if res.Error.Code != "BAD_REQUEST" || res.Error.Message != "Invalid parameters" {
			t.Fatalf("unexpected error detail: %+v", res.Error)
		}
	})
}

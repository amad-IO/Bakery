package models

import (
	"encoding/json"
	"math"
	"sync"
	"testing"

	"github.com/google/uuid"
)

// TestConcurrentUUIDHooksAndCollision verifies that UUID generation in BeforeCreate
// is concurrency-safe, has zero collisions across thousands of concurrent calls,
// and preserves existing pre-set UUIDs.
func TestConcurrentUUIDHooksAndCollision(t *testing.T) {
	const goroutines = 1000
	var wg sync.WaitGroup
	seenUUIDs := sync.Map{}

	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()

			modelsToCheck := []interface{}{
				&User{},
				&Category{},
				&Product{},
				&Order{},
				&OrderItem{},
				&Payment{},
				&StockMovement{},
				&ActivityLog{},
				&StoreSettings{},
			}

			for _, m := range modelsToCheck {
				// Invoke BeforeCreate
				switch model := m.(type) {
				case *User:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("User ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				case *Category:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("Category ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				case *Product:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("Product ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				case *Order:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("Order ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				case *OrderItem:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("OrderItem ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				case *Payment:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("Payment ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				case *StockMovement:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("StockMovement ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				case *ActivityLog:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("ActivityLog ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				case *StoreSettings:
					_ = model.BeforeCreate(nil)
					if model.ID == uuid.Nil {
						t.Errorf("StoreSettings ID is Nil after BeforeCreate")
					}
					if _, loaded := seenUUIDs.LoadOrStore(model.ID, true); loaded {
						t.Errorf("UUID collision detected: %v", model.ID)
					}
				}
			}
		}()
	}
	wg.Wait()

	// Test preserving existing pre-set UUID
	customID := uuid.MustParse("12345678-1234-1234-1234-123456789abc")
	u := User{ID: customID}
	_ = u.BeforeCreate(nil)
	if u.ID != customID {
		t.Fatalf("BeforeCreate overwrote non-nil UUID! Expected %v, got %v", customID, u.ID)
	}
}

// TestJSONMapAdversarialEdgeCases tests edge cases, malformed inputs, nil maps,
// invalid JSON, and non-serializable objects for JSONMap.
func TestJSONMapAdversarialEdgeCases(t *testing.T) {
	t.Run("nil JSONMap Value", func(t *testing.T) {
		var j JSONMap = nil
		val, err := j.Value()
		if err != nil {
			t.Fatalf("unexpected error for nil JSONMap.Value(): %v", err)
		}
		if str, ok := val.(string); !ok || str != "{}" {
			t.Fatalf("expected nil JSONMap.Value() to return string '{}', got %v (%T)", val, val)
		}
	})

	t.Run("Scan nil into non-nil pointer", func(t *testing.T) {
		var j JSONMap
		if err := j.Scan(nil); err != nil {
			t.Fatalf("unexpected error for Scan(nil): %v", err)
		}
		if j == nil {
			t.Fatalf("expected j to be initialized after Scan(nil)")
		}
		if len(j) != 0 {
			t.Fatalf("expected empty map, got len %d", len(j))
		}
	})

	t.Run("Scan string input", func(t *testing.T) {
		var j JSONMap
		strJSON := `{"role": "admin", "attempts": 3}`
		if err := j.Scan(strJSON); err != nil {
			t.Fatalf("unexpected error scanning string JSON: %v", err)
		}
		if j["role"] != "admin" || j["attempts"] != float64(3) {
			t.Fatalf("unexpected scanned map content: %v", j)
		}
	})

	t.Run("Scan invalid data types (no panic)", func(t *testing.T) {
		invalidInputs := []interface{}{
			12345,
			true,
			3.14159,
			struct{ A string }{"test"},
		}

		for _, input := range invalidInputs {
			var j JSONMap
			err := j.Scan(input)
			if err == nil {
				t.Errorf("expected error when scanning invalid type %T, got nil", input)
			}
		}
	})

	t.Run("Scan malformed JSON bytes (no panic)", func(t *testing.T) {
		malformed := [][]byte{
			[]byte("{invalid json"),
			[]byte(""),
			[]byte("[1, 2, 3]"), // Array instead of object
			[]byte("12345"),
			[]byte("true"),
		}

		for _, data := range malformed {
			var j JSONMap
			err := j.Scan(data)
			if err == nil {
				t.Errorf("expected error for malformed JSON '%s', got nil", string(data))
			}
		}
	})

	t.Run("Value on unmarshalable map content", func(t *testing.T) {
		j := JSONMap{
			"bad_chan": make(chan int),
		}
		_, err := j.Value()
		if err == nil {
			t.Fatalf("expected error from json.Marshal with channel value, got nil")
		}

		j2 := JSONMap{
			"nan": math.NaN(),
		}
		_, err = j2.Value()
		if err == nil {
			t.Fatalf("expected error from json.Marshal with math.NaN(), got nil")
		}
	})

	t.Run("Scan nil pointer handling", func(t *testing.T) {
		var jPtr *JSONMap = nil
		defer func() {
			r := recover()
			if r == nil {
				t.Errorf("expected panic when scanning into nil *JSONMap pointer, but no panic occurred")
			} else {
				t.Logf("Observed expected panic on nil *JSONMap dereference: %v", r)
			}
		}()
		_ = jPtr.Scan(nil)
	})
}

// TestModelTableNames verifies that TableName() on all 9 models matches ERD table names.
func TestModelTableNames(t *testing.T) {
	tables := map[string]string{
		User{}.TableName():          "users",
		Category{}.TableName():      "categories",
		Product{}.TableName():       "products",
		Order{}.TableName():         "orders",
		OrderItem{}.TableName():     "order_items",
		Payment{}.TableName():       "payments",
		StockMovement{}.TableName(): "stock_movements",
		ActivityLog{}.TableName():   "activity_logs",
		StoreSettings{}.TableName(): "store_settings",
	}

	for got, expected := range tables {
		if got != expected {
			t.Errorf("TableName mismatch: got '%s', expected '%s'", got, expected)
		}
	}
}

// TestModelStructTagsAndJSONSecurity verifies json tags, sensitive field masking,
// and handling of null/nil pointers during JSON marshalling.
func TestModelStructTagsAndJSONSecurity(t *testing.T) {
	t.Run("User password_hash security", func(t *testing.T) {
		u := User{
			ID:           uuid.New(),
			Name:         "Super Admin",
			Email:        "admin@kaya.id",
			PasswordHash: "$2a$10$verysecretpasswordhash",
			Role:         RoleAdmin,
			IsActive:     true,
		}

		data, err := json.Marshal(u)
		if err != nil {
			t.Fatalf("failed to marshal User: %v", err)
		}

		var m map[string]interface{}
		if err := json.Unmarshal(data, &m); err != nil {
			t.Fatalf("failed to unmarshal User JSON: %v", err)
		}

		if _, exists := m["password_hash"]; exists {
			t.Fatalf("CRITICAL SECURITY VULNERABILITY: password_hash was leaked in JSON output!")
		}
		if _, exists := m["PasswordHash"]; exists {
			t.Fatalf("CRITICAL SECURITY VULNERABILITY: PasswordHash was leaked in JSON output!")
		}
	})

	t.Run("Order with nil pointers JSON serialization", func(t *testing.T) {
		ord := Order{
			ID:           uuid.New(),
			OrderCode:    "KYA-20260812-0001",
			CustomerName: "John Customer",
			OrderType:    OrderTypePreorder,
			Status:       OrderStatusPendingPayment,
			CashierID:    nil,
			Cashier:      nil,
			Items:        nil,
			Payments:     nil,
		}

		data, err := json.Marshal(ord)
		if err != nil {
			t.Fatalf("failed to marshal Order with nil pointers: %v", err)
		}

		var m map[string]interface{}
		if err := json.Unmarshal(data, &m); err != nil {
			t.Fatalf("failed to unmarshal Order JSON: %v", err)
		}

		if m["cashier_id"] != nil {
			t.Fatalf("expected cashier_id to be null in JSON, got %v", m["cashier_id"])
		}
		if _, exists := m["cashier"]; exists {
			t.Fatalf("expected cashier field to be omitted (omitempty) in JSON, got %v", m["cashier"])
		}
	})
}

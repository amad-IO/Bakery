package models

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestBeforeCreateUUIDHooks(t *testing.T) {
	u := User{Name: "Test User", Email: "test@example.com"}
	if u.ID != uuid.Nil {
		t.Fatalf("expected initial ID to be nil, got %v", u.ID)
	}
	if err := u.BeforeCreate(nil); err != nil {
		t.Fatalf("unexpected error in BeforeCreate: %v", err)
	}
	if u.ID == uuid.Nil {
		t.Fatalf("expected ID to be generated, got nil UUID")
	}

	cat := Category{Name: "Pastry", Slug: "pastry"}
	_ = cat.BeforeCreate(nil)
	if cat.ID == uuid.Nil {
		t.Fatalf("expected Category ID to be generated")
	}

	prod := Product{Name: "Croissant", Slug: "croissant", Price: 25000}
	_ = prod.BeforeCreate(nil)
	if prod.ID == uuid.Nil {
		t.Fatalf("expected Product ID to be generated")
	}

	ord := Order{OrderCode: "KYA-20260812-0001", CustomerName: "Jane Doe"}
	_ = ord.BeforeCreate(nil)
	if ord.ID == uuid.Nil {
		t.Fatalf("expected Order ID to be generated")
	}

	item := OrderItem{ProductNameSnapshot: "Croissant", PriceSnapshot: 25000, Qty: 2}
	_ = item.BeforeCreate(nil)
	if item.ID == uuid.Nil {
		t.Fatalf("expected OrderItem ID to be generated")
	}

	pay := Payment{Method: PaymentMethodCash, Amount: 50000}
	_ = pay.BeforeCreate(nil)
	if pay.ID == uuid.Nil {
		t.Fatalf("expected Payment ID to be generated")
	}

	sm := StockMovement{Type: StockMovementIn, Qty: 10}
	_ = sm.BeforeCreate(nil)
	if sm.ID == uuid.Nil {
		t.Fatalf("expected StockMovement ID to be generated")
	}

	al := ActivityLog{Action: "create_product", EntityType: "product"}
	_ = al.BeforeCreate(nil)
	if al.ID == uuid.Nil {
		t.Fatalf("expected ActivityLog ID to be generated")
	}

	st := StoreSettings{Key: "store_name", Value: "KAYA Bakery"}
	_ = st.BeforeCreate(nil)
	if st.ID == uuid.Nil {
		t.Fatalf("expected StoreSettings ID to be generated")
	}
}

func TestJSONMapScannerValuer(t *testing.T) {
	meta := JSONMap{
		"ip":     "127.0.0.1",
		"browser": "Chrome",
	}

	val, err := meta.Value()
	if err != nil {
		t.Fatalf("JSONMap.Value() returned error: %v", err)
	}

	bytes, ok := val.([]byte)
	if !ok {
		t.Fatalf("expected Value() to return []byte, got %T", val)
	}

	var scanned JSONMap
	if err := scanned.Scan(bytes); err != nil {
		t.Fatalf("JSONMap.Scan() returned error: %v", err)
	}

	if scanned["ip"] != "127.0.0.1" || scanned["browser"] != "Chrome" {
		t.Fatalf("scanned content does not match original: %v", scanned)
	}
}

func TestModelJSONSerialization(t *testing.T) {
	now := time.Now()
	id := uuid.New()
	u := User{
		ID:           id,
		Name:         "Admin",
		Email:        "admin@kaya.id",
		PasswordHash: "secret_hash",
		Role:         RoleAdmin,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	data, err := json.Marshal(u)
	if err != nil {
		t.Fatalf("failed to marshal User: %v", err)
	}

	str := string(data)
	if testing.Verbose() {
		t.Logf("Serialized user: %s", str)
	}

	// Verify PasswordHash is excluded from JSON
	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal JSON: %v", err)
	}

	if _, exists := parsed["password_hash"]; exists {
		t.Fatalf("password_hash field should not be present in JSON output")
	}

	if parsed["email"] != "admin@kaya.id" {
		t.Fatalf("expected email 'admin@kaya.id', got %v", parsed["email"])
	}
}

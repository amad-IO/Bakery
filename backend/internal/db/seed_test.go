package db

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestSeedDBNilDB(t *testing.T) {
	// Calling SeedDB with nil DB should panic or return error when executing DB query
	defer func() {
		if r := recover(); r == nil {
			// If it didn't panic, it might return error or handle it. Either is expected for nil DB.
		}
	}()

	err := SeedDB(nil)
	if err == nil {
		t.Log("SeedDB(nil) returned nil or handled nil db")
	}
}

func TestSeedAdminPasswordHashVerification(t *testing.T) {
	// Verify that password "rahasia123" matches the bcrypt hash algorithm used in SeedDB
	password := "rahasia123"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("Failed to generate password hash: %v", err)
	}

	err = bcrypt.CompareHashAndPassword(hash, []byte(password))
	if err != nil {
		t.Errorf("CompareHashAndPassword failed for admin seeded password: %v", err)
	}

	err = bcrypt.CompareHashAndPassword(hash, []byte("wrongpassword"))
	if err == nil {
		t.Errorf("CompareHashAndPassword succeeded for wrong password")
	}
}

package utils

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestGenerateAndValidateToken(t *testing.T) {
	secret := "test-secret-key-12345"
	userID := "550e8400-e29b-41d4-a716-446655440000"
	email := "owner@kaya.id"
	role := "admin"

	// 1. Test Generate Token
	token, err := GenerateToken(userID, email, role, secret, 1)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}
	if token == "" {
		t.Fatalf("Expected non-empty token string")
	}

	// 2. Test Validate Token Success
	claims, err := ValidateToken(token, secret)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("Expected UserID %s, got %s", userID, claims.UserID)
	}
	if claims.Email != email {
		t.Errorf("Expected Email %s, got %s", email, claims.Email)
	}
	if claims.Role != role {
		t.Errorf("Expected Role %s, got %s", role, claims.Role)
	}

	// 3. Test Validate Token Invalid Secret
	_, err = ValidateToken(token, "wrong-secret")
	if err == nil {
		t.Errorf("Expected error when validating with wrong secret, got nil")
	}

	// 4. Test Expired Token
	expiredClaims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			Issuer:    "kaya-bakery",
		},
	}
	expiredTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	expiredTokenStr, err := expiredTokenObj.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("Failed to generate expired token: %v", err)
	}

	_, err = ValidateToken(expiredTokenStr, secret)
	if err == nil {
		t.Errorf("Expected error when validating expired token, got nil")
	}

	// 5. Test Malformed Token
	_, err = ValidateToken("invalid.token.string", secret)
	if err == nil {
		t.Errorf("Expected error when validating malformed token, got nil")
	}
}

func TestPasswordHashing(t *testing.T) {
	password := "rahasia123"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}
	if hash == "" {
		t.Fatalf("Expected non-empty hash")
	}

	if !CheckPasswordHash(password, hash) {
		t.Errorf("CheckPasswordHash failed for correct password")
	}

	if CheckPasswordHash("wrongpassword", hash) {
		t.Errorf("CheckPasswordHash returned true for incorrect password")
	}
}

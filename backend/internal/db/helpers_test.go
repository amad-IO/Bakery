package db

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func TestIsNotFound(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{"nil error", nil, false},
		{"gorm.ErrRecordNotFound", gorm.ErrRecordNotFound, true},
		{"wrapped ErrRecordNotFound", fmt.Errorf("query failed: %w", gorm.ErrRecordNotFound), true},
		{"double wrapped ErrRecordNotFound", fmt.Errorf("outer: %w", fmt.Errorf("inner: %w", gorm.ErrRecordNotFound)), true},
		{"other error", errors.New("connection reset"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsNotFound(tt.err)
			if got != tt.expected {
				t.Errorf("IsNotFound(%v) = %v, expected %v", tt.err, got, tt.expected)
			}
		})
	}
}

func TestIsDuplicateKey(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{"nil error", nil, false},
		{"pg 23505 unique error", &pgconn.PgError{Code: "23505"}, true},
		{"wrapped pg 23505 error", fmt.Errorf("db error: %w", &pgconn.PgError{Code: "23505"}), true},
		{"pg 23503 foreign key error", &pgconn.PgError{Code: "23503"}, false},
		{"pg 23502 not null error", &pgconn.PgError{Code: "23502"}, false},
		{"standard string duplicate error", errors.New("duplicate key value violates unique constraint"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsDuplicateKey(tt.err)
			if got != tt.expected {
				t.Errorf("IsDuplicateKey(%v) = %v, expected %v", tt.err, got, tt.expected)
			}
		})
	}
}

func TestPaginate(t *testing.T) {
	tests := []struct {
		name           string
		page           int
		limit          int
		expectedOffset int
		expectedLimit  int
	}{
		{"normal page 1", 1, 10, 0, 10},
		{"normal page 2", 2, 20, 20, 20},
		{"zero values fallback", 0, 0, 0, 20},
		{"negative values fallback", -5, -10, 0, 20},
		{"limit exceeds maximum cap 100", 1, 500, 0, 100},
		{"large page number", 10, 15, 135, 15},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dummyDB := &gorm.DB{Statement: &gorm.Statement{Clauses: make(map[string]clause.Clause)}}
			scopeFunc := Paginate(tt.page, tt.limit)
			tx := scopeFunc(dummyDB)
			
			c, ok := tx.Statement.Clauses["LIMIT"]
			if !ok {
				t.Fatalf("expected LIMIT clause to be present in GORM statement")
			}
			limitClause, ok := c.Expression.(clause.Limit)
			if !ok {
				t.Fatalf("expected clause expression to be clause.Limit, got %T", c.Expression)
			}

			if limitClause.Offset != tt.expectedOffset {
				t.Errorf("Paginate(%d, %d) Offset = %d, expected %d", tt.page, tt.limit, limitClause.Offset, tt.expectedOffset)
			}
			
			actualLimit := 0
			if limitClause.Limit != nil {
				actualLimit = *limitClause.Limit
			}
			if actualLimit != tt.expectedLimit {
				t.Errorf("Paginate(%d, %d) Limit = %d, expected %d", tt.page, tt.limit, actualLimit, tt.expectedLimit)
			}
		})
	}
}

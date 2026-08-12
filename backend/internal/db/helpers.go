package db

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

// WithTransaction runs fn inside a DB transaction with automatic rollback on error/panic
func WithTransaction(db *gorm.DB, fn func(tx *gorm.DB) error) (err error) {
	tx := db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin transaction: %w", tx.Error)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		} else {
			if commitErr := tx.Commit().Error; commitErr != nil {
				err = fmt.Errorf("failed to commit transaction: %w", commitErr)
			}
		}
	}()

	err = fn(tx)
	return err
}

// IsNotFound checks if error is gorm.ErrRecordNotFound
func IsNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}

// IsDuplicateKey checks if error is PostgreSQL unique constraint violation (code 23505)
func IsDuplicateKey(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

// Paginate provides a reusable GORM scope for pagination queries
func Paginate(page, limit int) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		if page <= 0 {
			page = 1
		}
		if limit <= 0 {
			limit = 20
		} else if limit > 100 {
			limit = 100
		}

		offset := (page - 1) * limit
		return db.Offset(offset).Limit(limit)
	}
}

package db

import (
	"fmt"
	"log"

	"kaya-bakery/internal/models"

	"gorm.io/gorm"
)

// AutoMigrate executes database migrations for all 9 GORM models in dependency order
func AutoMigrate(db *gorm.DB) error {
	log.Println("Starting database auto-migration...")

	// 1. Ensure pgcrypto extension for gen_random_uuid()
	if err := db.Exec(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`).Error; err != nil {
		log.Printf("Notice: pgcrypto extension check: %v", err)
	}

	// 2. Run AutoMigrate in order
	err := db.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.StoreSettings{},
		&models.Product{},
		&models.Order{},
		&models.OrderItem{},
		&models.Payment{},
		&models.StockMovement{},
		&models.ActivityLog{},
	)
	if err != nil {
		return fmt.Errorf("AutoMigrate failed: %w", err)
	}

	// 3. Create explicit performance indexes from ERD.md §3
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);`,
		`CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);`,
		`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,
		`CREATE INDEX IF NOT EXISTS idx_orders_cashier_id ON orders(cashier_id);`,
		`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`,
		`CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);`,
		`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);`,
	}

	for _, idxSQL := range indexes {
		if err := db.Exec(idxSQL).Error; err != nil {
			return fmt.Errorf("failed to create index [%s]: %w", idxSQL, err)
		}
	}

	log.Println("Database auto-migration completed successfully.")
	return nil
}

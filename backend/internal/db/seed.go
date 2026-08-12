package db

import (
	"log"

	"kaya-bakery/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedDB seeds initial database data idempotently
func SeedDB(db *gorm.DB) error {
	log.Println("Seeding initial database data...")

	// 1. Seed Admin User
	var adminCount int64
	db.Model(&models.User{}).Where("email = ?", "owner@kaya.id").Count(&adminCount)
	if adminCount == 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte("rahasia123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		admin := models.User{
			Name:         "Owner KAYA Bakery",
			Email:        "owner@kaya.id",
			Phone:        "081234567890",
			PasswordHash: string(hash),
			Role:         models.RoleAdmin,
			IsActive:     true,
		}
		if err := db.Create(&admin).Error; err != nil {
			return err
		}
		log.Println("Seeded admin account: owner@kaya.id")
	}

	// 2. Seed Default Categories
	categories := []models.Category{
		{Name: "Roti Tawar", Slug: "roti-tawar", DisplayOrder: 1},
		{Name: "Roti Manis", Slug: "roti-manis", DisplayOrder: 2},
		{Name: "Pastry", Slug: "pastry", DisplayOrder: 3},
		{Name: "Kue", Slug: "kue", DisplayOrder: 4},
		{Name: "Minuman", Slug: "minuman", DisplayOrder: 5},
	}

	for _, cat := range categories {
		var count int64
		db.Model(&models.Category{}).Where("slug = ?", cat.Slug).Count(&count)
		if count == 0 {
			if err := db.Create(&cat).Error; err != nil {
				return err
			}
			log.Printf("Seeded category: %s", cat.Name)
		}
	}

	// 3. Seed Default Store Settings
	settings := map[string]string{
		"store_name":         "KAYA Bakery",
		"store_open_time":    "07:00",
		"store_close_time":   "20:00",
		"store_address":      "Jl. Roti Lezat No. 88, Jakarta",
		"whatsapp_number":    "6281234567890",
		"min_preorder_hours": "2",
	}

	for key, val := range settings {
		var count int64
		db.Model(&models.StoreSettings{}).Where("key = ?", key).Count(&count)
		if count == 0 {
			setting := models.StoreSettings{Key: key, Value: val}
			if err := db.Create(&setting).Error; err != nil {
				return err
			}
			log.Printf("Seeded setting: %s = %s", key, val)
		}
	}

	log.Println("Database seeding completed.")
	return nil
}

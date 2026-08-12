package handlers

import (
	"net/http"
	"time"

	"kaya-bakery/internal/models"
	"kaya-bakery/internal/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DashboardHandler struct {
	db *gorm.DB
}

func NewDashboardHandler(db *gorm.DB) *DashboardHandler {
	return &DashboardHandler{db: db}
}

type topProductRow struct {
	ProductID string `gorm:"column:product_id" json:"product_id"`
	Name      string `gorm:"column:name" json:"name"`
	SoldQty   int    `gorm:"column:sold_qty" json:"sold_qty"`
}

// GET /admin/dashboard/stats
func (h *DashboardHandler) GetStats(c *gin.Context) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var revenueToday float64
	var revenueMonth float64
	var ordersToday int64

	h.db.Model(&models.Order{}).
		Where("status IN ? AND created_at >= ?", []string{"paid", "preparing", "ready", "completed"}, todayStart).
		Select("COALESCE(SUM(total), 0)").Scan(&revenueToday)

	h.db.Model(&models.Order{}).
		Where("status IN ? AND created_at >= ?", []string{"paid", "preparing", "ready", "completed"}, monthStart).
		Select("COALESCE(SUM(total), 0)").Scan(&revenueMonth)

	h.db.Model(&models.Order{}).Where("created_at >= ?", todayStart).Count(&ordersToday)

	var topProducts []topProductRow
	h.db.Model(&models.OrderItem{}).
		Select("order_items.product_id, order_items.product_name_snapshot as name, SUM(order_items.qty) as sold_qty").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.created_at >= ? AND orders.status IN ?", monthStart, []string{"paid", "preparing", "ready", "completed"}).
		Group("order_items.product_id, order_items.product_name_snapshot").
		Order("sold_qty DESC").
		Limit(5).
		Scan(&topProducts)

	var lowStock []struct {
		ID       string `gorm:"column:id" json:"id"`
		Name     string `gorm:"column:name" json:"name"`
		StockQty int    `gorm:"column:stock_qty" json:"stock_qty"`
	}
	h.db.Model(&models.Product{}).
		Where("stock_qty < 10 AND is_available = true").
		Select("id, name, stock_qty").
		Limit(10).
		Scan(&lowStock)

	response.SuccessResponse(c, http.StatusOK, gin.H{
		"revenue_today":      revenueToday,
		"revenue_this_month": revenueMonth,
		"orders_today":       ordersToday,
		"top_products":       topProducts,
		"low_stock_products": lowStock,
	})
}

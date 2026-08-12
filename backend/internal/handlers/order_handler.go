package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"kaya-bakery/internal/models"
	"kaya-bakery/internal/response"
	"kaya-bakery/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderHandler struct {
	db *gorm.DB
}

func NewOrderHandler(db *gorm.DB) *OrderHandler {
	return &OrderHandler{db: db}
}

// generateOrderCode returns format KYA-YYYYMMDD-XXXX with uniqueness retry
func (h *OrderHandler) generateOrderCode() string {
	for i := 0; i < 10; i++ {
		code := fmt.Sprintf("KYA-%s-%04d", time.Now().Format("20060102"), rand.Intn(9000)+1000)
		var count int64
		h.db.Model(&models.Order{}).Where("order_code = ?", code).Count(&count)
		if count == 0 {
			return code
		}
	}
	// fallback with nanoseconds
	return fmt.Sprintf("KYA-%s-%d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)
}

// deductStockForOrder decrement stock and insert stock_movements for each order item
func (h *OrderHandler) deductStockForOrder(order *models.Order, actorID uuid.UUID) error {
	var items []models.OrderItem
	if err := h.db.Where("order_id = ?", order.ID).Find(&items).Error; err != nil {
		return err
	}
	for _, item := range items {
		h.db.Model(&models.Product{}).Where("id = ?", item.ProductID).
			Update("stock_qty", gorm.Expr("GREATEST(stock_qty - ?, 0)", item.Qty))

		movement := models.StockMovement{
			ProductID:   item.ProductID,
			Type:        models.StockMovementOut,
			Qty:         item.Qty,
			Note:        fmt.Sprintf("Sold via order %s", order.OrderCode),
			CreatedByID: actorID,
		}
		h.db.Create(&movement)
	}
	return nil
}

// ─── Public ───────────────────────────────────────────────────

// POST /orders — public preorder
func (h *OrderHandler) CreatePublicOrder(c *gin.Context) {
	var req struct {
		CustomerName  string `json:"customer_name" binding:"required"`
		CustomerPhone string `json:"customer_phone"`
		Items         []struct {
			ProductID uuid.UUID `json:"product_id" binding:"required"`
			Qty       int       `json:"qty" binding:"required,gt=0"`
		} `json:"items" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	// Calculate totals from DB prices
	var subtotal float64
	var orderItems []models.OrderItem

	for _, item := range req.Items {
		var product models.Product
		if err := h.db.First(&product, item.ProductID).Error; err != nil {
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", fmt.Sprintf("Product %s not found", item.ProductID))
			return
		}
		if !product.IsAvailable {
			response.ErrorResponse(c, http.StatusConflict, "CONFLICT", fmt.Sprintf("Product '%s' is not available", product.Name))
			return
		}
		itemSubtotal := product.Price * float64(item.Qty)
		subtotal += itemSubtotal
		orderItems = append(orderItems, models.OrderItem{
			ProductID:           product.ID,
			ProductNameSnapshot: product.Name,
			PriceSnapshot:       product.Price,
			Qty:                 item.Qty,
			Subtotal:            itemSubtotal,
		})
	}

	orderCode := h.generateOrderCode()

	order := models.Order{
		OrderCode:     orderCode,
		CustomerName:  req.CustomerName,
		CustomerPhone: req.CustomerPhone,
		OrderType:     models.OrderTypePreorder,
		Status:        models.OrderStatusPendingPayment,
		Subtotal:      subtotal,
		Discount:      0,
		Total:         subtotal,
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		for i := range orderItems {
			orderItems[i].OrderID = order.ID
		}
		return tx.Create(&orderItems).Error
	})
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to create order")
		return
	}

	h.db.Preload("Items").First(&order, order.ID)
	response.SuccessResponse(c, http.StatusCreated, order)
}

// POST /orders/:id/pay_mock — simulate payment for preorder
func (h *OrderHandler) MockPayOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid order ID")
		return
	}

	var order models.Order
	if err := h.db.Preload("Items").First(&order, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Order not found")
		return
	}
	if order.Status != models.OrderStatusPendingPayment {
		response.ErrorResponse(c, http.StatusConflict, "CONFLICT", "Order is not awaiting payment")
		return
	}

	now := time.Now()
	systemUserID := uuid.Nil // system actor for public mock payments

	err = h.db.Transaction(func(tx *gorm.DB) error {
		// Update order status to paid
		if err := tx.Model(&order).Updates(map[string]interface{}{
			"status": models.OrderStatusPaid,
		}).Error; err != nil {
			return err
		}

		// Insert payment record
		payment := models.Payment{
			OrderID:     order.ID,
			Method:      models.PaymentMethodQRIS,
			Amount:      order.Total,
			Status:      models.PaymentStatusSuccess,
			ReferenceNo: fmt.Sprintf("MOCK-%d", rand.Intn(999999)),
			PaidAt:      &now,
		}
		return tx.Create(&payment).Error
	})
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to process payment")
		return
	}

	// Deduct stock
	_ = h.deductStockForOrder(&order, systemUserID)

	h.db.Preload("Items").Preload("Payments").First(&order, id)
	response.SuccessResponse(c, http.StatusOK, order)
}

// GET /orders/:order_code — public status check
func (h *OrderHandler) GetOrderByCode(c *gin.Context) {
	code := c.Param("order_code")
	var order models.Order
	if err := h.db.Preload("Items").Where("order_code = ?", code).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Order not found")
			return
		}
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch order")
		return
	}
	response.SuccessResponse(c, http.StatusOK, order)
}

// ─── POS (kasir + admin) ──────────────────────────────────────

// POST /pos/orders — walk-in POS order
func (h *OrderHandler) CreatePOSOrder(c *gin.Context) {
	var req struct {
		CustomerName  string `json:"customer_name"`
		CustomerPhone string `json:"customer_phone"`
		Method        string `json:"method" binding:"required"`
		Items         []struct {
			ProductID uuid.UUID `json:"product_id" binding:"required"`
			Qty       int       `json:"qty" binding:"required,gt=0"`
		} `json:"items" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	userIDStr, _ := c.Get("user_id")
	cashierID, _ := uuid.Parse(fmt.Sprintf("%v", userIDStr))

	customerName := req.CustomerName
	if customerName == "" {
		customerName = "Guest"
	}

	var subtotal float64
	var orderItems []models.OrderItem

	for _, item := range req.Items {
		var product models.Product
		if err := h.db.First(&product, item.ProductID).Error; err != nil {
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", fmt.Sprintf("Product %s not found", item.ProductID))
			return
		}
		itemSubtotal := product.Price * float64(item.Qty)
		subtotal += itemSubtotal
		orderItems = append(orderItems, models.OrderItem{
			ProductID:           product.ID,
			ProductNameSnapshot: product.Name,
			PriceSnapshot:       product.Price,
			Qty:                 item.Qty,
			Subtotal:            itemSubtotal,
		})
	}

	orderCode := h.generateOrderCode()
	now := time.Now()

	order := models.Order{
		OrderCode:     orderCode,
		CustomerName:  customerName,
		CustomerPhone: req.CustomerPhone,
		OrderType:     models.OrderTypePOS,
		Status:        models.OrderStatusPaid,
		Subtotal:      subtotal,
		Discount:      0,
		Total:         subtotal,
		CashierID:     &cashierID,
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		for i := range orderItems {
			orderItems[i].OrderID = order.ID
		}
		if err := tx.Create(&orderItems).Error; err != nil {
			return err
		}
		payment := models.Payment{
			OrderID:     order.ID,
			Method:      models.PaymentMethod(req.Method),
			Amount:      subtotal,
			Status:      models.PaymentStatusSuccess,
			ReferenceNo: fmt.Sprintf("POS-%d", rand.Intn(999999)),
			PaidAt:      &now,
		}
		return tx.Create(&payment).Error
	})
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to create POS order")
		return
	}

	_ = h.deductStockForOrder(&order, cashierID)
	_ = services.LogActivity(h.db, cashierID, "created_pos_order", "order", order.ID, models.JSONMap{"order_code": order.OrderCode, "total": order.Total})

	h.db.Preload("Items").Preload("Payments").First(&order, order.ID)
	response.SuccessResponse(c, http.StatusCreated, order)
}

// GET /pos/orders/scan/:order_code
func (h *OrderHandler) ScanOrder(c *gin.Context) {
	code := c.Param("order_code")
	var order models.Order
	if err := h.db.Preload("Items").Where("order_code = ?", code).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Order not found")
			return
		}
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to scan order")
		return
	}
	response.SuccessResponse(c, http.StatusOK, order)
}

// PATCH /pos/orders/:id/status
func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid order ID")
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	validStatuses := map[string]bool{
		"pending": true, "pending_payment": true, "paid": true,
		"preparing": true, "ready": true, "completed": true, "cancelled": true,
	}
	if !validStatuses[req.Status] {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid status value")
		return
	}

	var order models.Order
	if err := h.db.First(&order, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Order not found")
		return
	}

	prevStatus := string(order.Status)

	if err := h.db.Model(&order).Update("status", req.Status).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to update status")
		return
	}

	// If transitioning to paid for the first time, deduct stock
	if req.Status == "paid" && prevStatus != "paid" {
		userIDStr, _ := c.Get("user_id")
		userID, _ := uuid.Parse(fmt.Sprintf("%v", userIDStr))
		_ = h.deductStockForOrder(&order, userID)
	}

	_ = services.LogActivityFromContext(c, h.db, "updated_order_status", "order", id, models.JSONMap{
		"from": prevStatus, "to": req.Status,
	})

	response.SuccessResponse(c, http.StatusOK, order)
}

// POST /pos/orders/:id/payments
func (h *OrderHandler) RecordPayment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid order ID")
		return
	}

	var req struct {
		Method      string  `json:"method" binding:"required"`
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		ReferenceNo string  `json:"reference_no"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	var order models.Order
	if err := h.db.First(&order, id).Error; err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "Order not found")
		return
	}

	now := time.Now()
	payment := models.Payment{
		OrderID:     order.ID,
		Method:      models.PaymentMethod(req.Method),
		Amount:      req.Amount,
		Status:      models.PaymentStatusSuccess,
		ReferenceNo: req.ReferenceNo,
		PaidAt:      &now,
	}

	if err := h.db.Create(&payment).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to record payment")
		return
	}

	// Update order status to paid if pending
	if order.Status == models.OrderStatusPendingPayment || order.Status == models.OrderStatusPending {
		h.db.Model(&order).Update("status", models.OrderStatusPaid)
		userIDStr, _ := c.Get("user_id")
		userID, _ := uuid.Parse(fmt.Sprintf("%v", userIDStr))
		_ = h.deductStockForOrder(&order, userID)
	}

	_ = services.LogActivityFromContext(c, h.db, "recorded_payment", "payment", payment.ID, models.JSONMap{
		"order_id": id, "method": req.Method, "amount": req.Amount,
	})

	response.SuccessResponse(c, http.StatusCreated, payment)
}

// GET /admin/orders
func (h *OrderHandler) ListAllOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	q := h.db.Model(&models.Order{}).Preload("Items").Preload("Cashier")

	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	if ot := c.Query("order_type"); ot != "" {
		q = q.Where("order_type = ?", ot)
	}
	if cashierID := c.Query("cashier_id"); cashierID != "" {
		q = q.Where("cashier_id = ?", cashierID)
	}
	if from := c.Query("date_from"); from != "" {
		q = q.Where("created_at >= ?", from)
	}
	if to := c.Query("date_to"); to != "" {
		q = q.Where("created_at <= ?", to)
	}

	var total int64
	q.Count(&total)

	var orders []models.Order
	if err := q.Order("created_at DESC").Offset(offset).Limit(limit).Find(&orders).Error; err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to fetch orders")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    orders,
		"meta":    gin.H{"page": page, "limit": limit, "total": total},
	})
}

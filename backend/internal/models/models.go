package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ==========================================
// Custom Types & Enums
// ==========================================

type UserRole string

const (
	RoleAdmin UserRole = "admin"
	RoleKasir UserRole = "kasir"
)

type OrderType string

const (
	OrderTypePOS      OrderType = "pos"
	OrderTypePreorder OrderType = "preorder"
)

type OrderStatus string

const (
	OrderStatusPending        OrderStatus = "pending"
	OrderStatusPendingPayment OrderStatus = "pending_payment"
	OrderStatusPaid           OrderStatus = "paid"
	OrderStatusPreparing      OrderStatus = "preparing"
	OrderStatusReady          OrderStatus = "ready"
	OrderStatusCompleted      OrderStatus = "completed"
	OrderStatusCancelled      OrderStatus = "cancelled"
)

type PaymentMethod string

const (
	PaymentMethodCash     PaymentMethod = "cash"
	PaymentMethodQRIS     PaymentMethod = "qris"
	PaymentMethodTransfer PaymentMethod = "transfer"
	PaymentMethodCard     PaymentMethod = "card"
)

type PaymentStatus string

const (
	PaymentStatusPending PaymentStatus = "pending"
	PaymentStatusSuccess PaymentStatus = "success"
	PaymentStatusFailed  PaymentStatus = "failed"
)

type StockMovementType string

const (
	StockMovementIn         StockMovementType = "in"
	StockMovementOut        StockMovementType = "out"
	StockMovementAdjustment StockMovementType = "adjustment"
)

// JSONMap represents a Postgres JSONB field
type JSONMap map[string]interface{}

func (m JSONMap) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}
	return json.Marshal(m)
}

func (m *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*m = make(JSONMap)
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("type assertion to []byte or string failed for JSONMap")
	}
	return json.Unmarshal(bytes, m)
}

// ==========================================
// 1. User Model
// Table: users
// ==========================================

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name         string    `gorm:"type:varchar(255);not null" json:"name"`
	Email        string    `gorm:"type:varchar(255);uniqueIndex:idx_users_email;not null" json:"email"`
	Phone        string    `gorm:"type:varchar(50)" json:"phone"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	Role         UserRole  `gorm:"type:varchar(20);not null" json:"role"`
	IsActive     bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt    time.Time `gorm:"not null" json:"created_at"`
	UpdatedAt    time.Time `gorm:"not null" json:"updated_at"`

	// Relationships
	CreatedProducts []Product       `gorm:"foreignKey:CreatedByID" json:"-"`
	HandledOrders   []Order         `gorm:"foreignKey:CashierID" json:"-"`
	StockMovements  []StockMovement `gorm:"foreignKey:CreatedByID" json:"-"`
	ActivityLogs    []ActivityLog   `gorm:"foreignKey:UserID" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

func (User) TableName() string {
	return "users"
}

// ==========================================
// 2. Category Model
// Table: categories
// ==========================================

type Category struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name         string    `gorm:"type:varchar(255);not null" json:"name"`
	Slug         string    `gorm:"type:varchar(255);uniqueIndex:idx_categories_slug;not null" json:"slug"`
	DisplayOrder int       `gorm:"not null;default:0" json:"display_order"`
	CreatedAt    time.Time `gorm:"not null" json:"created_at"`

	// Relationships
	Products []Product `gorm:"foreignKey:CategoryID" json:"products,omitempty"`
}

func (c *Category) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

func (Category) TableName() string {
	return "categories"
}

// ==========================================
// 3. Product Model
// Table: products
// ==========================================

type Product struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CategoryID  uuid.UUID      `gorm:"type:uuid;not null;index:idx_products_category_id" json:"category_id"`
	Category    *Category      `gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"category,omitempty"`
	CreatedByID uuid.UUID      `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy   *User          `gorm:"foreignKey:CreatedByID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"created_by,omitempty"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	Slug        string         `gorm:"type:varchar(255);uniqueIndex:idx_products_slug;not null" json:"slug"`
	Description string         `gorm:"type:text" json:"description"`
	SKU         string         `gorm:"type:varchar(100);uniqueIndex:idx_products_sku" json:"sku"`
	Price       float64        `gorm:"type:numeric(12,2);not null" json:"price"`
	StockQty    int            `gorm:"not null;default:0" json:"stock_qty"`
	IsAvailable bool           `gorm:"not null;default:true;index:idx_products_is_available" json:"is_available"`
	ImageURL    string         `gorm:"type:varchar(500)" json:"image_url"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	CreatedAt   time.Time      `gorm:"not null" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"not null" json:"updated_at"`

	// Relationships
	OrderItems     []OrderItem     `gorm:"foreignKey:ProductID" json:"-"`
	StockMovements []StockMovement `gorm:"foreignKey:ProductID" json:"-"`
}

func (p *Product) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (Product) TableName() string {
	return "products"
}

// ==========================================
// 4. Order Model
// Table: orders
// ==========================================

type Order struct {
	ID            uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderCode     string      `gorm:"type:varchar(50);uniqueIndex:idx_orders_order_code;not null" json:"order_code"`
	CustomerName  string      `gorm:"type:varchar(255);not null" json:"customer_name"`
	CustomerPhone string      `gorm:"type:varchar(50)" json:"customer_phone"`
	OrderType     OrderType   `gorm:"type:varchar(20);not null" json:"order_type"`
	Status        OrderStatus `gorm:"type:varchar(20);not null;default:'pending';index:idx_orders_status" json:"status"`
	Subtotal      float64     `gorm:"type:numeric(12,2);not null;default:0" json:"subtotal"`
	Discount      float64     `gorm:"type:numeric(12,2);not null;default:0" json:"discount"`
	Total         float64     `gorm:"type:numeric(12,2);not null;default:0" json:"total"`
	CashierID     *uuid.UUID  `gorm:"type:uuid;index:idx_orders_cashier_id" json:"cashier_id"`
	Cashier       *User       `gorm:"foreignKey:CashierID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"cashier,omitempty"`
	CreatedAt     time.Time   `gorm:"not null" json:"created_at"`
	UpdatedAt     time.Time   `gorm:"not null" json:"updated_at"`

	// Has Many Relationships
	Items    []OrderItem `gorm:"foreignKey:OrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"items,omitempty"`
	Payments []Payment   `gorm:"foreignKey:OrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"payments,omitempty"`
}

func (o *Order) BeforeCreate(tx *gorm.DB) (err error) {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}

func (Order) TableName() string {
	return "orders"
}

// ==========================================
// 5. OrderItem Model
// Table: order_items
// ==========================================

type OrderItem struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderID             uuid.UUID `gorm:"type:uuid;not null;index:idx_order_items_order_id" json:"order_id"`
	Order               *Order    `gorm:"foreignKey:OrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	ProductID           uuid.UUID `gorm:"type:uuid;not null;index:idx_order_items_product_id" json:"product_id"`
	Product             *Product  `gorm:"foreignKey:ProductID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"product,omitempty"`
	ProductNameSnapshot string    `gorm:"type:varchar(255);not null" json:"product_name_snapshot"`
	PriceSnapshot       float64   `gorm:"type:numeric(12,2);not null" json:"price_snapshot"`
	Qty                 int       `gorm:"not null" json:"qty"`
	Subtotal            float64   `gorm:"type:numeric(12,2);not null" json:"subtotal"`
}

func (oi *OrderItem) BeforeCreate(tx *gorm.DB) (err error) {
	if oi.ID == uuid.Nil {
		oi.ID = uuid.New()
	}
	return nil
}

func (OrderItem) TableName() string {
	return "order_items"
}

// ==========================================
// 6. Payment Model
// Table: payments
// ==========================================

type Payment struct {
	ID          uuid.UUID     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderID     uuid.UUID     `gorm:"type:uuid;not null;index:idx_payments_order_id" json:"order_id"`
	Order       *Order        `gorm:"foreignKey:OrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	Method      PaymentMethod `gorm:"type:varchar(20);not null" json:"method"`
	Amount      float64       `gorm:"type:numeric(12,2);not null" json:"amount"`
	Status      PaymentStatus `gorm:"type:varchar(20);not null;default:'pending'" json:"status"`
	ReferenceNo string        `gorm:"type:varchar(100)" json:"reference_no"`
	PaidAt      *time.Time    `json:"paid_at"`
}

func (p *Payment) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (Payment) TableName() string {
	return "payments"
}

// ==========================================
// 7. StockMovement Model
// Table: stock_movements
// ==========================================

type StockMovement struct {
	ID          uuid.UUID         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID   uuid.UUID         `gorm:"type:uuid;not null;index:idx_stock_movements_product_id" json:"product_id"`
	Product     *Product          `gorm:"foreignKey:ProductID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"product,omitempty"`
	Type        StockMovementType `gorm:"type:varchar(20);not null" json:"type"`
	Qty         int               `gorm:"not null" json:"qty"`
	Note        string            `gorm:"type:varchar(255)" json:"note"`
	CreatedByID uuid.UUID         `gorm:"type:uuid;not null;index:idx_stock_movements_user_id" json:"created_by_id"`
	CreatedBy   *User             `gorm:"foreignKey:CreatedByID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"created_by,omitempty"`
	CreatedAt   time.Time         `gorm:"not null" json:"created_at"`
}

func (sm *StockMovement) BeforeCreate(tx *gorm.DB) (err error) {
	if sm.ID == uuid.Nil {
		sm.ID = uuid.New()
	}
	return nil
}

func (StockMovement) TableName() string {
	return "stock_movements"
}

// ==========================================
// 8. ActivityLog Model
// Table: activity_logs
// ==========================================

type ActivityLog struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null;index:idx_activity_logs_user_id" json:"user_id"`
	User       *User     `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"user,omitempty"`
	Action     string    `gorm:"type:varchar(100);not null" json:"action"`
	EntityType string    `gorm:"type:varchar(100);not null" json:"entity_type"`
	EntityID   uuid.UUID `gorm:"type:uuid;not null" json:"entity_id"`
	Metadata   JSONMap   `gorm:"type:jsonb" json:"metadata"`
	CreatedAt  time.Time `gorm:"not null" json:"created_at"`
}

func (al *ActivityLog) BeforeCreate(tx *gorm.DB) (err error) {
	if al.ID == uuid.Nil {
		al.ID = uuid.New()
	}
	return nil
}

func (ActivityLog) TableName() string {
	return "activity_logs"
}

// ==========================================
// 9. StoreSettings Model
// Table: store_settings
// ==========================================

type StoreSettings struct {
	ID    uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Key   string    `gorm:"type:varchar(100);uniqueIndex:idx_store_settings_key;not null" json:"key"`
	Value string    `gorm:"type:text" json:"value"`
}

func (ss *StoreSettings) BeforeCreate(tx *gorm.DB) (err error) {
	if ss.ID == uuid.Nil {
		ss.ID = uuid.New()
	}
	return nil
}

func (StoreSettings) TableName() string {
	return "store_settings"
}

// StoreSetting is an alias for StoreSettings to support singular/plural usage
type StoreSetting = StoreSettings

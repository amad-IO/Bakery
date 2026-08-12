import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import JsBarcode from 'jsbarcode'

interface CartItem {
  id: string
  name: string
  price: number
  image_url: string
  stock_qty: number
  qty: number
}

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function BarcodeDisplay({ orderCode, total, onClose }: { orderCode: string; total: number; onClose: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, orderCode, {
        format: 'CODE128', width: 2, height: 60,
        displayValue: false, background: '#ffffff', lineColor: '#241610', margin: 10,
      })
    }
  }, [orderCode])

  const download = () => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const data = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = svg.width.baseVal.value
    canvas.height = svg.height.baseVal.value
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.download = `kaya-${orderCode}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl2 p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <iconify-icon icon="ri:checkbox-circle-fill" width="28" className="text-success" />
        </div>
        <h3 className="font-heading font-bold text-xl text-canvas-alt mb-1">Pembayaran Berhasil!</h3>
        <p className="text-canvas-alt/50 text-sm mb-5">Tunjukkan barcode ini kepada kasir</p>

        <div className="bg-white border border-black/10 rounded-xl p-4 mb-4">
          <svg ref={svgRef} className="w-full" />
          <p className="font-mono font-bold text-canvas-alt mt-2">{orderCode}</p>
          <p className="text-primary font-bold text-lg mt-1">{formatRp(total)}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={download} className="btn-outline flex-1 text-canvas-alt text-sm flex items-center justify-center gap-2">
            <iconify-icon icon="ri:download-line" width="16" /> Simpan
          </button>
          <button onClick={onClose} className="btn-primary flex-1 justify-center text-sm">Tutup</button>
        </div>
      </div>
    </div>
  )
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentModal, setPaymentModal] = useState(false)
  const [method, setMethod] = useState<'cash' | 'qris' | 'transfer' | 'card'>('cash')
  const [customerName, setCustomerName] = useState('')
  const [successOrder, setSuccessOrder] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => api.get('/products?limit=100').then(r => r.data.data || []),
    refetchInterval: 30000,
  })

  const orderMutation = useMutation({
    mutationFn: async () => {
      const { data: orderRes } = await api.post('/pos/orders', {
        customer_name: customerName || 'Guest',
        method,
        items: cart.map(i => ({ product_id: i.id, qty: i.qty })),
      })
      return orderRes.data
    },
    onSuccess: (order) => {
      setSuccessOrder(order)
      setPaymentModal(false)
      setCart([])
      setCustomerName('')
    },
  })

  const addToCart = (product: any) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id)
      if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    )
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

  const filtered = searchQuery
    ? products.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-5 -m-6 p-6">
      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-xl font-heading font-bold text-canvas-alt">POS</h1>
          <div className="flex-1 relative">
            <iconify-icon icon="ri:search-line" width="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-canvas-alt/40" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((p: any) => {
              const isHabis = p.stock_qty <= 0
              const inCart = cart.find(i => i.id === p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => !isHabis && addToCart(p)}
                  disabled={isHabis}
                  className={`text-left bg-white rounded-xl border transition-all duration-150 overflow-hidden
                    ${isHabis ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/40 hover:shadow-md active:scale-[0.98] cursor-pointer'}
                    ${inCart ? 'border-primary' : 'border-black/[0.06]'}`}
                >
                  <div
                    className="h-28 relative"
                    style={{
                      background: p.image_url
                        ? `url(${p.image_url}) center/cover`
                        : 'linear-gradient(135deg, #3a2415 0%, #e8a33d44 100%)',
                    }}
                  >
                    {isHabis && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold bg-danger/80 px-2 py-0.5 rounded-full">Habis</span>
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-canvas-alt text-xs font-bold">{inCart.qty}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-canvas-alt text-sm leading-snug line-clamp-1">{p.name}</p>
                    <p className="text-primary font-bold text-sm mt-0.5">{formatRp(p.price)}</p>
                    <p className={`text-xs mt-0.5 ${p.stock_qty < 10 ? 'text-yellow-600' : 'text-canvas-alt/40'}`}>
                      Stok: {p.stock_qty}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white rounded-xl2 border border-black/[0.06] overflow-hidden">
        <div className="p-4 border-b border-black/[0.06]">
          <h2 className="font-heading font-bold text-canvas-alt">Keranjang</h2>
          <p className="text-canvas-alt/50 text-xs">{cart.reduce((s, i) => s + i.qty, 0)} item</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30 py-8">
              <iconify-icon icon="ri:shopping-cart-2-line" width="32" />
              <p className="text-sm mt-2">Ketuk produk untuk menambah</p>
            </div>
          )}
          {cart.map(item => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.02]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-canvas-alt truncate">{item.name}</p>
                <p className="text-primary text-xs font-semibold">{formatRp(item.price * item.qty)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 text-xs flex items-center justify-center font-bold transition-colors">−</button>
                <span className="w-5 text-center text-sm font-bold text-canvas-alt">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 text-xs flex items-center justify-center font-bold transition-colors">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-black/[0.06] space-y-3">
          <div className="flex justify-between font-heading font-bold text-canvas-alt">
            <span>Total</span>
            <span className="text-primary">{formatRp(total)}</span>
          </div>
          <button
            onClick={() => cart.length > 0 && setPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full btn-primary justify-center rounded-xl2 py-3 disabled:opacity-40"
          >
            BAYAR
          </button>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="w-full text-xs text-canvas-alt/40 hover:text-danger transition-colors">
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Payment Method Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl2 w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-heading font-bold text-xl text-canvas-alt mb-5">Konfirmasi Pembayaran</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Nama Pelanggan (opsional)</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="input-field" placeholder="Guest" />
              </div>
              <div>
                <label className="label">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(['cash', 'qris', 'transfer', 'card'] as const).map(m => (
                    <button key={m} onClick={() => setMethod(m)}
                      className={`py-2.5 rounded-lg border text-sm font-semibold transition-all ${method === m ? 'border-primary bg-primary/10 text-primary' : 'border-black/10 text-canvas-alt/60 hover:border-primary/30'}`}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-page-bg rounded-xl p-3 space-y-1">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span className="text-canvas-alt/60">{i.name} ×{i.qty}</span>
                    <span className="font-semibold text-canvas-alt">{formatRp(i.price * i.qty)}</span>
                  </div>
                ))}
                <div className="border-t border-black/10 pt-1 flex justify-between font-bold">
                  <span className="text-canvas-alt">Total</span>
                  <span className="text-primary">{formatRp(total)}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPaymentModal(false)} className="btn-outline flex-1 text-canvas-alt">Batal</button>
                <button onClick={() => orderMutation.mutate()} disabled={orderMutation.isPending} className="btn-primary flex-1 justify-center">
                  {orderMutation.isPending ? 'Memproses...' : 'Proses Bayar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Barcode */}
      {successOrder && (
        <BarcodeDisplay
          orderCode={successOrder.order_code}
          total={successOrder.total}
          onClose={() => setSuccessOrder(null)}
        />
      )}
    </div>
  )
}

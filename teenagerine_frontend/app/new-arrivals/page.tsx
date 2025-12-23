import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import { fetchProducts } from '@/lib/api';

// Mock Data for fallback
const MOCK_PRODUCTS = [
    { id: '1', name: 'Womens Gold Tone Cat Eye Sunglasses', brand: 'Dolce & Gabbana', price: 15490, image: 'https://via.placeholder.com/300x400' },
    { id: '2', name: 'Black Quilted Leather Bag', brand: 'Chanel', price: 450000, image: 'https://via.placeholder.com/300x400' },
    { id: '3', name: 'Monogram Canvas Speedy', brand: 'Louis Vuitton', price: 125000, image: 'https://via.placeholder.com/300x400' },
    { id: '4', name: 'Red Leather Crossbody', brand: 'Gucci', price: 98000, image: 'https://via.placeholder.com/300x400' },
    { id: '5', name: 'Beige Trench Coat', brand: 'Burberry', price: 110000, image: 'https://via.placeholder.com/300x400' },
    { id: '6', name: 'Silk Scarf', brand: 'Hermes', price: 45000, image: 'https://via.placeholder.com/300x400' },
    { id: '7', name: 'Rockstud Heels', brand: 'Valentino', price: 85000, image: 'https://via.placeholder.com/300x400' },
    { id: '8', name: 'Saddle Bag', brand: 'Dior', price: 320000, image: 'https://via.placeholder.com/300x400' },
];

export default async function NewArrivals() {
    let products = await fetchProducts();
    if (!products || products.length === 0) {
        products = MOCK_PRODUCTS;
    }

    return (
        <>
            <Header />
            <main className="container" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
                    <Link href="/">Home</Link> / <span>New Arrivals</span>
                </div>

                <h1 className="section-title" style={{ textAlign: 'left' }}>New Arrivals</h1>

                <div style={{ display: 'flex', gap: '40px' }}>
                    {/* Sidebar Filters */}
                    <aside style={{ width: '250px', flexShrink: 0 }}>
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Categories</h3>
                            <ul style={{ fontSize: '0.9rem', lineHeight: '2' }}>
                                <li><label><input type="checkbox" /> Bags</label></li>
                                <li><label><input type="checkbox" /> Shoes</label></li>
                                <li><label><input type="checkbox" /> Accessories</label></li>
                                <li><label><input type="checkbox" /> Clothing</label></li>
                            </ul>
                        </div>
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Designers</h3>
                            <ul style={{ fontSize: '0.9rem', lineHeight: '2' }}>
                                <li><label><input type="checkbox" /> Chanel</label></li>
                                <li><label><input type="checkbox" /> Gucci</label></li>
                                <li><label><input type="checkbox" /> Louis Vuitton</label></li>
                                <li><label><input type="checkbox" /> Dior</label></li>
                            </ul>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <span>Showing {products.length} products</span>
                            <select style={{ padding: '8px', border: '1px solid #ddd' }}>
                                <option>Sort by: Newest</option>
                                <option>Sort by: Price (Low to High)</option>
                                <option>Sort by: Price (High to Low)</option>
                            </select>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '30px'
                        }}>
                            {products.map((p: any) => (
                                <ProductCard
                                    key={p.id || p._id}
                                    id={p.id || p._id}
                                    name={p.name || p.title}
                                    brand={p.brand || 'Luxury Brand'}
                                    price={p.price}
                                    image={p.image || p.images?.[0] || 'https://via.placeholder.com/300x400'}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

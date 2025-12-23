import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Heart, Truck, ShieldCheck, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ProductDetail({ params }: { params: { id: string } }) {
    // Mock Data
    const product = {
        id: params.id,
        name: 'Womens Gold Tone Cat Eye Sunglasses',
        brand: 'Dolce & Gabbana',
        price: 15490,
        originalPrice: 25000,
        description: 'Stunning gold-tone cat-eye sunglasses from Dolce & Gabbana. Features tinted lenses and logo detail on the temples. Excellent condition with minor signs of wear.',
        images: [
            'https://via.placeholder.com/600x800',
            'https://via.placeholder.com/600x800',
            'https://via.placeholder.com/600x800'
        ],
        details: [
            'Condition: Excellent',
            'Material: Metal',
            'Color: Gold',
            'Includes: Original Case'
        ]
    };

    return (
        <>
            <Header />
            <main className="container" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
                    <Link href="/">Home</Link> / <Link href="/new-arrivals">New Arrivals</Link> / <span>{product.name}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '60px' }}>
                    {/* Image Gallery */}
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {product.images.map((img, i) => (
                                <img key={i} src={img} alt="" style={{ width: '80px', height: '100px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #ddd' }} />
                            ))}
                        </div>
                        <div style={{ flex: 1 }}>
                            <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
                        </div>
                    </div>

                    {/* Product Info */}
                    <div>
                        <div style={{ fontSize: '1.1rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                            {product.brand}
                        </div>
                        <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', marginBottom: '20px' }}>{product.name}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹ {product.price.toLocaleString()}</span>
                            <span style={{ textDecoration: 'line-through', color: '#999' }}>₹ {product.originalPrice.toLocaleString()}</span>
                            <span style={{ color: 'green', fontSize: '0.9rem' }}>40% OFF</span>
                        </div>

                        <div style={{ marginBottom: '30px', fontSize: '1rem', lineHeight: '1.6', color: '#444' }}>
                            {product.description}
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '15px' }}>Add to Cart</button>
                            <button className="btn btn-outline" style={{ padding: '15px' }}><Heart /></button>
                        </div>

                        {/* Trust Badges */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.8rem', textAlign: 'center', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '20px 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <ShieldCheck size={24} color="var(--color-primary)" />
                                <span>100% Authentic</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <Truck size={24} color="var(--color-primary)" />
                                <span>Free Shipping</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <RefreshCw size={24} color="var(--color-primary)" />
                                <span>Easy Returns</span>
                            </div>
                        </div>

                        {/* Details Tab */}
                        <div style={{ marginTop: '30px' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Product Details</h3>
                            <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
                                {product.details.map((d, i) => (
                                    <li key={i} style={{ marginBottom: '5px', color: '#555' }}>{d}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

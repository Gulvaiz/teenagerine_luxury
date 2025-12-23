import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import { fetchProducts } from '@/lib/api';

export default async function SalePage() {
    const products = await fetchProducts();
    // Filter for products that have a salePrice and it is less than the regular price
    const saleProducts = products.filter((p: any) => p.salePrice && p.salePrice < p.price);

    return (
        <>
            <Header />
            <main className="container" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
                    <Link href="/">Home</Link> / <span>Sale</span>
                </div>

                <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '30px', fontSize: '2rem', fontWeight: 'bold' }}>Sale Collection</h1>

                <div style={{ display: 'flex', gap: '40px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <span>Showing {saleProducts.length} products</span>
                        </div>

                        {saleProducts.length > 0 ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '30px'
                            }}>
                                {saleProducts.map((p: any) => (
                                    <ProductCard
                                        key={p._id || p.id}
                                        id={p._id || p.id}
                                        name={p.name}
                                        brand={p.primaryBrand?.name || p.brand || 'Luxury Brand'}
                                        price={p.salePrice || p.price}
                                        image={p.image || p.images?.[0] || 'https://via.placeholder.com/300x400'}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                                <h3 style={{ marginBottom: '10px' }}>No items on sale right now</h3>
                                <p style={{ color: '#666', marginBottom: '20px' }}>Check back later for exclusive deals!</p>
                                <Link href="/new-arrivals">
                                    <button style={{ padding: '10px 20px', backgroundColor: 'black', color: 'white', border: 'none', cursor: 'pointer' }}>Shop New Arrivals</button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

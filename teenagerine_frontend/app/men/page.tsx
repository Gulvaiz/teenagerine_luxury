import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import { fetchProducts } from '@/lib/api';
import Link from 'next/link';

export default async function MenPage({ searchParams }: { searchParams: Promise<{ [key: string]: string }> }) {
    const resolvedSearchParams = await searchParams;
    const params = { ...resolvedSearchParams, category: 'men' };
    const products = await fetchProducts(params);

    return (
        <>
            <Header />
            <main className="container" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
                    <Link href="/">Home</Link> / <span>Men</span>
                </div>

                <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '30px', fontSize: '2rem', fontWeight: 'bold' }}>
                    Men Products
                </h1>

                <div style={{ display: 'flex', gap: '40px' }}>
                    <FilterSidebar />

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <span>Showing {products.length} products</span>
                        </div>

                        {products.length > 0 ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '30px'
                            }}>
                                {products.map((p: any) => (
                                    <ProductCard
                                        key={p._id || p.id}
                                        id={p._id || p.id}
                                        name={p.name}
                                        brand={p.primaryBrand?.name || p.brand || 'Luxury Brand'}
                                        price={p.price}
                                        image={p.image || p.images?.[0] || 'https://via.placeholder.com/300x400'}
                                        soldOut={p.stockQuantity === 0 || p.soldOut === true}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                                <p>No products found matching your criteria.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

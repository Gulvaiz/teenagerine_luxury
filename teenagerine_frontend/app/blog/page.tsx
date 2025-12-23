import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function BlogPage() {
    return (
        <>
            <Header />
            <main className="container" style={{ padding: '40px 20px', minHeight: '60vh' }}>
                <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
                    <Link href="/">Home</Link> / <span>Blog</span>
                </div>

                <h1 className="section-title" style={{ marginBottom: '40px' }}>Luxury Lifestyle Blog</h1>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                    {[1, 2, 3].map((item) => (
                        <div key={item} style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ height: '200px', backgroundColor: '#f0f0f0' }}></div>
                            <div style={{ padding: '20px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase' }}>Fashion</span>
                                <h3 style={{ margin: '10px 0', fontSize: '1.2rem' }}>Trends to Watch This Season</h3>
                                <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6', marginBottom: '15px' }}>
                                    Discover the latest trends from top luxury designers...
                                </p>
                                <Link href="#" style={{ textDecoration: 'underline', fontSize: '0.9rem' }}>Read More</Link>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            <Footer />
        </>
    );
}

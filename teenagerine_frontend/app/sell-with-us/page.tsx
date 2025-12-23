import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function SellWithUsPage() {
    return (
        <>
            <Header />
            <main className="container" style={{ padding: '40px 20px', minHeight: '60vh' }}>
                <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
                    <Link href="/">Home</Link> / <span>Sell With Us</span>
                </div>

                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <h1 className="section-title" style={{ marginBottom: '20px' }}>Sell With Us</h1>
                    <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '40px', lineHeight: '1.6' }}>
                        Give your pre-loved luxury items a new home. TANGERINE LUXURY offers a seamless way to consign your designer bags, accessories, and shoes.
                    </p>

                    <div style={{ backgroundColor: '#F9F9F9', padding: '40px', borderRadius: '8px', textAlign: 'left' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', textAlign: 'center' }}>Consignment Form</h2>
                        <form style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Full Name *</label>
                                <input type="text" placeholder="Your Name" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Email Address *</label>
                                <input type="email" placeholder="email@example.com" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Phone Number *</label>
                                <input type="tel" placeholder="+91" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Product Description *</label>
                                <textarea placeholder="Brand, Model, Condition, etc." rows={4} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required></textarea>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Upload Photos (Optional)</label>
                                <input type="file" multiple style={{ width: '100%' }} />
                                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>Clear photos of the item help us evaluate it faster.</p>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Submit for Valuation</button>
                        </form>
                    </div>

                    <div style={{ marginTop: '50px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', textAlign: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>1. Submit</h3>
                            <p style={{ fontSize: '0.9rem', color: '#666' }}>Fill out the form with details and photos of your item.</p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>2. Ship</h3>
                            <p style={{ fontSize: '0.9rem', color: '#666' }}>Once approved, ship your item to our authentication center.</p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>3. Earn</h3>
                            <p style={{ fontSize: '0.9rem', color: '#666' }}>Get paid once your item sells on our platform.</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

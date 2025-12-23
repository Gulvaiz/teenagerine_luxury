import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function Cart() {
    return (
        <>
            <Header />
            <main className="container" style={{ padding: '40px 20px', minHeight: '60vh' }}>
                <h1 className="section-title">Shopping Bag</h1>

                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9' }}>
                    <p style={{ marginBottom: '20px' }}>Your bag is currently empty.</p>
                    <Link href="/new-arrivals">
                        <button className="btn btn-primary">Continue Shopping</button>
                    </Link>
                </div>
            </main>
            <Footer />
        </>
    );
}

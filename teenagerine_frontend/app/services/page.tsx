import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Truck, ShieldCheck, Gem, RefreshCw } from 'lucide-react';

export default function Services() {
    return (
        <>
            <Header />
            <main className="container" style={{ padding: '60px 20px' }}>
                <h1 className="section-title">Our Premium Services</h1>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginTop: '40px' }}>
                    <div style={{ padding: '30px', border: '1px solid #eee', borderRadius: '8px', textAlign: 'center' }}>
                        <Gem size={48} color="var(--color-primary)" style={{ marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Authentication</h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>Every item sold on Tangerine Luxury undergoes a rigorous multi-point inspection by our expert authenticators to ensure its 100% genuine.</p>
                    </div>

                    <div style={{ padding: '30px', border: '1px solid #eee', borderRadius: '8px', textAlign: 'center' }}>
                        <ShieldCheck size={48} color="var(--color-primary)" style={{ marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Consignment</h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>Sell your luxury items with us effectively. We handle photography, marketing, and shipping, offering you competitive commission rates.</p>
                    </div>

                    <div style={{ padding: '30px', border: '1px solid #eee', borderRadius: '8px', textAlign: 'center' }}>
                        <Truck size={48} color="var(--color-primary)" style={{ marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Restoration</h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>Give your loved luxury bags and shoes a new life. Our bag spa services clean, repair, and restore your items to their former glory.</p>
                    </div>

                    <div style={{ padding: '30px', border: '1px solid #eee', borderRadius: '8px', textAlign: 'center' }}>
                        <RefreshCw size={48} color="var(--color-primary)" style={{ marginBottom: '20px' }} />
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Sourcing</h3>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>Looking for a specific rare piece? Our global network of partners allows us to source exclusive luxury items just for you.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

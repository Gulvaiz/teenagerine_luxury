import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { ArrowRight } from 'lucide-react';

// Temporary Mock Data
const PRODUCTS = [
  { id: '1', name: 'Womens Gold Tone Cat Eye Sunglasses', brand: 'Dolce & Gabbana', price: 15490, image: 'https://via.placeholder.com/300x400' },
  { id: '2', name: 'Black Quilted Leather Bag', brand: 'Chanel', price: 450000, image: 'https://via.placeholder.com/300x400' },
  { id: '3', name: 'Monogram Canvas Speedy', brand: 'Louis Vuitton', price: 125000, image: 'https://via.placeholder.com/300x400' },
  { id: '4', name: 'Red Leather Crossbody', brand: 'Gucci', price: 98000, image: 'https://via.placeholder.com/300x400' },
];

export default function Home() {
  return (
    <>
      <Header />

      <main>
        {/* HERO SECTION */}
        <section style={{
          height: '80vh',
          backgroundImage: 'url("https://via.placeholder.com/1920x1080")', // Replace with real asset
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#fff',
          position: 'relative'
        }}>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '40px',
            borderRadius: '8px',
            backdropFilter: 'blur(5px)'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '10px' }}>Preloved - Reloved</h2>
            <h1 style={{ fontSize: '4rem', fontFamily: 'var(--font-serif)', marginBottom: '30px' }}>Luxury you Admire</h1>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button className="btn btn-white">Shop Now</button>
              <button className="btn btn-primary">Sell With Us</button>
            </div>
          </div>
        </section>

        {/* FEATURED SECTION */}
        <section className="container" style={{ padding: '80px 20px' }}>
          <h2 className="section-title">Just In</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '30px'
          }}>
            {PRODUCTS.map(p => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button className="btn btn-outline">View All <ArrowRight size={16} style={{ marginLeft: 8 }} /></button>
          </div>
        </section>

        {/* CATEGORIES / BANNER */}
        <section style={{ backgroundColor: '#f9f9f9', padding: '80px 0' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div style={{
                height: '400px',
                backgroundColor: '#ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <h3>Shop Women</h3>
              </div>
              <div style={{
                height: '400px',
                backgroundColor: '#ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <h3>Shop Men</h3>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

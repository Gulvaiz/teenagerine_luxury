import Link from 'next/link';
import { Heart } from 'lucide-react';
import styles from './ProductCard.module.css';

interface ProductCardProps {
    id: string;
    name: string;
    brand: string;
    price: number;
    image: string;
    soldOut?: boolean;
}

export default function ProductCard({ id, name, brand, price, image, soldOut = false }: ProductCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.imageContainer}>
                {/* Using standard img for now, migrate to Next/Image later with proper loader */}
                <img src={image} alt={name} className={styles.image} style={soldOut ? { opacity: 0.6 } : {}} />

                {soldOut && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        padding: '10px 20px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        letterSpacing: '1px',
                        zIndex: 2,
                        whiteSpace: 'nowrap'
                    }}>
                        SOLD OUT
                    </div>
                )}

                <button className={styles.wishlistBtn}>
                    <Heart size={18} />
                </button>
            </div>
            <Link href={`/product/${id}`} className={styles.info}>
                <div className={styles.brand}>{brand}</div>
                <div className={styles.name}>{name}</div>
                <div className={styles.price}>₹ {price.toLocaleString()}</div>
            </Link>
        </div>
    );
}

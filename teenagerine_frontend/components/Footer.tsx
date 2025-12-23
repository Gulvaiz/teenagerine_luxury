import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className="container">
                <div className={styles.grid}>
                    <div className={styles.column}>
                        <h4>About Us</h4>
                        <ul>
                            <li><Link href="/about">Our Story</Link></li>
                            <li><Link href="/sell-with-us">Sell With Us</Link></li>
                            <li><Link href="/careers">Careers</Link></li>
                            <li><Link href="/terms">Terms & Conditions</Link></li>
                            <li><Link href="/data-security">Data Security</Link></li>
                        </ul>
                    </div>
                    <div className={styles.column}>
                        <h4>Customer Care</h4>
                        <ul>
                            <li><Link href="/contact">Contact Us</Link></li>
                            <li><Link href="/shipping">Shipping & Returns</Link></li>
                            <li><Link href="/faq">FAQs</Link></li>
                            <li><Link href="/payment-methods">Payment Methods</Link></li>
                        </ul>
                    </div>
                    <div className={styles.column}>
                        <h4>Shop</h4>
                        <ul>
                            <li><Link href="/new-arrivals">New Arrivals</Link></li>
                            <li><Link href="/women">Women</Link></li>
                            <li><Link href="/men">Men</Link></li>
                            <li><Link href="/brands">Designers</Link></li>
                        </ul>
                    </div>
                    <div className={styles.column}>
                        <h4>Follow Us</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666' }}>
                            Stay updated with the latest luxury trends.
                        </p>
                        {/* Social icons would go here */}
                    </div>
                </div>
                <div className={styles.bottom}>
                    &copy; {new Date().getFullYear()} Tangerine Luxury. All Rights Reserved.
                </div>
            </div>
        </footer>
    );
}

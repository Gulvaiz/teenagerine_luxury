"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, ShoppingBag, User, Sprout } from 'lucide-react';
import styles from './Header.module.css';

export default function Header() {
    const messages = [
        "100% AUTHENTICATED LUXURY PRODUCTS",
        "Subscribe for latest arrivals",
        "USE CODE MYFIRST TO GET RS.2000 OFF ON YOUR FIRST ORDER ABOVE RS.15,000",
    ];

    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
        }, 3000); // 3 seconds per message
        return () => clearInterval(interval);
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <header className={styles.header}>
            <div className="top-bar">
                {messages[currentMessageIndex]}
            </div>
            <div className={styles.mainBar}>
                <Link href="/" className={styles.logo}>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, marginLeft: '10px' }}>
                        <span style={{ fontSize: '1.2rem', letterSpacing: '1px', fontWeight: 'bold' }}>TANGERINE</span>
                        <span style={{ fontSize: '0.8rem', letterSpacing: '3px', fontWeight: 'bold' }}>LUXURY</span>
                    </div>
                </Link>

                <form onSubmit={handleSearch} className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Search luxury items..."
                        className={styles.searchParams}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" style={{ border: 'none', background: 'none', cursor: 'pointer' }} className={styles.searchIcon}>
                        <Search size={18} />
                    </button>
                </form>

                <nav className={styles.nav}>
                    <div className={styles.navItem}>
                        <Link href="/" className={styles.navLink}>Home</Link>
                    </div>
                    <div className={styles.navItem}>
                        <Link href="/new-arrivals" className={styles.navLink}>Just In</Link>
                    </div>

                    {/* Women Mega Menu */}
                    <div className={styles.navItem}>
                        <Link href="/women" className={styles.navLink}>Women</Link>
                        <div className={styles.megaMenu}>
                            <div>
                                <Image src="https://via.placeholder.com/300x400" alt="Women New Collection" className={styles.menuImage} width={300} height={400} />
                                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                    <Link href="/women/new" style={{ textDecoration: 'underline' }}>Shop New Arrivals</Link>
                                </div>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Bags</h4>
                                <ul>
                                    <li><Link href="/women/bags/tote">Tote Bags</Link></li>
                                    <li><Link href="/women/bags/shoulder">Shoulder Bags</Link></li>
                                    <li><Link href="/women/bags/clutch">Clutch</Link></li>
                                    <li><Link href="/women/bags/sling">Sling Bags</Link></li>
                                    <li><Link href="/women/bags/mini">Mini Bags</Link></li>
                                    <li><Link href="/women/bags/satchel">Satchel Bags</Link></li>
                                    <li><Link href="/women/bags/handbags">Handbags</Link></li>
                                    <li><Link href="/women/bags/belt">Beltbag</Link></li>
                                </ul>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Clothing</h4>
                                <ul>
                                    <li><Link href="/women/clothing/dresses">Dresses & Gowns</Link></li>
                                    <li><Link href="/women/clothing/skirts">Skirts & Shorts</Link></li>
                                    <li><Link href="/women/clothing/tshirts">T Shirts & Shirts</Link></li>
                                    <li><Link href="/women/clothing/trousers">Trousers & Denims</Link></li>
                                    <li><Link href="/women/clothing/jackets">Jackets & Outerwear</Link></li>
                                    <li><Link href="/women/clothing/jumpsuits">Jumpsuits</Link></li>
                                </ul>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Footwear</h4>
                                <ul>
                                    <li><Link href="/women/footwear/boots">Boots</Link></li>
                                    <li><Link href="/women/footwear/espadrilles">Espadrilles</Link></li>
                                    <li><Link href="/women/footwear/flats">Flats & Slippers</Link></li>
                                    <li><Link href="/women/footwear/heels">Heels & Wedges</Link></li>
                                    <li><Link href="/women/footwear/sneakers">Sneakers</Link></li>
                                </ul>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Accessories</h4>
                                <ul>
                                    <li><Link href="/women/accessories/belts">Belts</Link></li>
                                    <li><Link href="/women/accessories/watches">Watches</Link></li>
                                    <li><Link href="/women/accessories/scarves">Shawls & Scarves</Link></li>
                                    <li><Link href="/women/accessories/sunglasses">Sunglasses</Link></li>
                                    <li><Link href="/women/accessories/jewelry">Jewelry</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className={styles.navItem}>
                        <Link href="/men" className={styles.navLink}>Men</Link>
                        <div className={styles.megaMenu}>
                            <div>
                                <Image src="https://via.placeholder.com/300x400" alt="Men New Collection" className={styles.menuImage} width={300} height={400} />
                                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                    <Link href="/men/new" style={{ textDecoration: 'underline' }}>Shop New Arrivals</Link>
                                </div>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Bags & Accessories</h4>
                                <ul>
                                    <li><Link href="/men/bags/messenger">Messenger Bags</Link></li>
                                    <li><Link href="/men/bags/backpacks">Backpacks</Link></li>
                                    <li><Link href="/men/bags/wallets">Wallets</Link></li>
                                    <li><Link href="/men/accessories/belts">Belts</Link></li>
                                    <li><Link href="/men/accessories/sunglasses">Sunglasses</Link></li>
                                </ul>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Clothing</h4>
                                <ul>
                                    <li><Link href="/men/clothing/shirts">Shirts</Link></li>
                                    <li><Link href="/men/clothing/tshirts">T-Shirts</Link></li>
                                    <li><Link href="/men/clothing/jackets">Jackets</Link></li>
                                    <li><Link href="/men/clothing/trousers">Trousers</Link></li>
                                    <li><Link href="/men/clothing/suits">Suits</Link></li>
                                </ul>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Footwear</h4>
                                <ul>
                                    <li><Link href="/men/footwear/sneakers">Sneakers</Link></li>
                                    <li><Link href="/men/footwear/loafers">Loafers</Link></li>
                                    <li><Link href="/men/footwear/boots">Boots</Link></li>
                                    <li><Link href="/men/footwear/formal">Formal Shoes</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className={styles.navItem}>
                        <Link href="/kids" className={styles.navLink}>Kids</Link>
                        <div className={styles.megaMenu}>
                            <div>
                                <Image src="https://via.placeholder.com/300x400" alt="Kids New Collection" className={styles.menuImage} width={300} height={400} />
                                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                    <Link href="/kids/new" style={{ textDecoration: 'underline' }}>Shop New Arrivals</Link>
                                </div>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Girls</h4>
                                <ul>
                                    <li><Link href="/kids/girls/dresses">Dresses</Link></li>
                                    <li><Link href="/kids/girls/clothing">Clothing Sets</Link></li>
                                    <li><Link href="/kids/girls/shoes">Shoes</Link></li>
                                    <li><Link href="/kids/girls/accessories">Accessories</Link></li>
                                </ul>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Boys</h4>
                                <ul>
                                    <li><Link href="/kids/boys/clothing">Clothing Sets</Link></li>
                                    <li><Link href="/kids/boys/shirts">Shirts & T-Shirts</Link></li>
                                    <li><Link href="/kids/boys/pants">Pants & Shorts</Link></li>
                                    <li><Link href="/kids/boys/shoes">Shoes</Link></li>
                                </ul>
                            </div>
                            <div className={styles.menuColumn}>
                                <h4>Baby</h4>
                                <ul>
                                    <li><Link href="/kids/baby/clothing">Clothing</Link></li>
                                    <li><Link href="/kids/baby/shoes">Shoes</Link></li>
                                    <li><Link href="/kids/baby/accessories">Accessories</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className={styles.navItem}>
                        <Link href="/services" className={styles.navLink}>Services</Link>
                    </div>
                    <div className={styles.navItem}>
                        <Link href="/sale" className={`${styles.navLink} ${styles.navLinkRed}`}>Sale</Link>
                    </div>
                    <div className={styles.navItem}>
                        <Link href="/sell-with-us" className={styles.navLink}>Sell With Us</Link>
                    </div>
                    <div className={styles.navItem}>
                        <Link href="/blog" className={styles.navLink}>Blog</Link>
                    </div>
                </nav>

                <div className={styles.actions}>
                    <Link href="/wishlist"><Heart size={20} className={styles.actionIcon} /></Link>
                    <Link href="/cart"><ShoppingBag size={20} className={styles.actionIcon} /></Link>
                    <Link href="/account"><User size={20} className={styles.actionIcon} /></Link>
                </div>
            </div>
        </header>
    );
}

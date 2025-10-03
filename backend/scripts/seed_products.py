#!/usr/bin/env python3
"""
Script to populate the database with sample products, categories, stores, and images.
Run this script to seed the database with test data.
"""

import sys
import os
import random
import re
from datetime import datetime, timedelta, timezone

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import engine, SessionLocal, Base
from app.models import User, Category, Store, Product, ProductImage, ProductOption, UserType, SubCategory, UserAddress

def slugify(text):
    """Convert a string to a slug format suitable for URLs"""
    # For non-Latin characters (like Farsi), we'll replace them with transliterated equivalents
    # This is a simple mapping - in production, you'd want a more comprehensive solution
    farsi_to_latin = {
        'الکترونیک': 'electronics',
        'پوشاک': 'clothing',
        'خانه و آشپزخانه': 'home-kitchen',
        'زیبایی و مراقبت شخصی': 'beauty-personal-care',
        'ورزش و فضای باز': 'sports-outdoors',
        'اسباب بازی و بازی': 'toys-games',
        'کتاب': 'books',
        'سلامت و تندرستی': 'health-wellness',
        'گوشی و لوازم جانبی': 'phones-accessories',
        'لپ تاپ و کامپیوتر': 'laptops-computers',
        'صوتی و تصویری': 'audio-video',
        'گجت‌های هوشمند': 'smart-gadgets',
        'لباس مردانه': 'mens-clothing',
        'لباس زنانه': 'womens-clothing',
        'لباس بچگانه': 'kids-clothing',
        'کفش و کیف': 'shoes-bags',
        'لوازم آشپزخانه': 'kitchen-appliances',
        'لوازم خانگی برقی': 'home-electronics',
        'دکوراسیون': 'decoration',
        'ابزار و تجهیزات': 'tools-equipment',
        'لوازم آرایشی': 'cosmetics',
        'مراقبت پوست': 'skin-care',
        'مراقبت مو': 'hair-care',
        'عطر و ادکلن': 'perfumes-colognes',
        'پوشاک ورزشی': 'sportswear',
        'لوازم ورزشی': 'sports-equipment',
        'کمپینگ و طبیعت‌گردی': 'camping-outdoors',
        'دوچرخه و لوازم جانبی': 'bikes-accessories',
        'اسباب بازی': 'toys',
        'بازی رومیزی': 'board-games',
        'بازی کنسولی': 'video-games',
        'لوازم تفریحی': 'recreational-items',
        'کتاب ادبیات': 'literature-books',
        'کتاب آموزشی': 'educational-books',
        'کتاب کودک': 'children-books',
        'کتاب الکترونیک': 'e-books',
        'مکمل‌های غذایی': 'supplements',
        'تجهیزات پزشکی': 'medical-equipment',
        'مراقبت شخصی': 'personal-care',
        'ورزش و تناسب اندام': 'fitness'
    }
    
    # Check if text is in our mapping
    if text in farsi_to_latin:
        return farsi_to_latin[text]
    
    # If not in mapping, apply standard slugify logic
    text = text.lower()
    # Replace spaces with hyphens
    text = re.sub(r'\s+', '-', text)
    # Remove all non-word chars
    text = re.sub(r'[^\w\-]', '', text)
    # Replace multiple hyphens with single hyphen
    text = re.sub(r'\-+', '-', text)
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    return text

def reset_database():
    """Drop all tables and recreate them"""
    try:
        print("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        print("Recreating tables...")
        Base.metadata.create_all(bind=engine)
        
        # Reset sequences in PostgreSQL
        with engine.connect() as conn:
            try:
                # Get all sequences from PostgreSQL
                result = conn.execute(text(
                    "SELECT relname FROM pg_class WHERE relkind = 'S';"
                ))
                sequences = [row[0] for row in result]
                
                # Reset each sequence
                for sequence in sequences:
                    conn.execute(text(f"ALTER SEQUENCE {sequence} RESTART WITH 1"))
                
                conn.commit()
                print(f"Reset {len(sequences)} PostgreSQL sequences")
            except Exception as e:
                print(f"Note: Couldn't reset sequences: {e}")
                # This might happen if not using PostgreSQL, which is fine
    except Exception as e:
        print(f"Error resetting database: {e}")
        print("Trying to create tables without dropping first...")
        # Try to just create tables without dropping
        Base.metadata.create_all(bind=engine)

# Sample data
categories = [
    "الکترونیک",
    "پوشاک",
    "خانه و آشپزخانه",
    "زیبایی و مراقبت شخصی",
    "ورزش و فضای باز",
    "اسباب بازی و بازی",
    "کتاب",
    "سلامت و تندرستی"
]

# Subcategories for each category
subcategories = {
    "الکترونیک": [
        "گوشی و لوازم جانبی",
        "لپ تاپ و کامپیوتر",
        "صوتی و تصویری",
        "گجت‌های هوشمند"
    ],
    "پوشاک": [
        "لباس مردانه",
        "لباس زنانه",
        "لباس بچگانه",
        "کفش و کیف"
    ],
    "خانه و آشپزخانه": [
        "لوازم آشپزخانه",
        "لوازم خانگی برقی",
        "دکوراسیون",
        "ابزار و تجهیزات"
    ],
    "زیبایی و مراقبت شخصی": [
        "لوازم آرایشی",
        "مراقبت پوست",
        "مراقبت مو",
        "عطر و ادکلن"
    ],
    "ورزش و فضای باز": [
        "پوشاک ورزشی",
        "لوازم ورزشی",
        "کمپینگ و طبیعت‌گردی",
        "دوچرخه و لوازم جانبی"
    ],
    "اسباب بازی و بازی": [
        "اسباب بازی",
        "بازی رومیزی",
        "بازی کنسولی",
        "لوازم تفریحی"
    ],
    "کتاب": [
        "کتاب ادبیات",
        "کتاب آموزشی",
        "کتاب کودک",
        "کتاب الکترونیک"
    ],
    "سلامت و تندرستی": [
        "مکمل‌های غذایی",
        "تجهیزات پزشکی",
        "مراقبت شخصی",
        "ورزش و تناسب اندام"
    ]
}

product_data = [
    {
        "name": "هدفون بلوتوث بی‌سیم",
        "description": "هدفون بی‌سیم با کیفیت بالا با قابلیت حذف نویز و عمر باتری ۲۰ ساعته. مناسب برای دوستداران موسیقی و مسافران.",
        "base_price": 129.99,
        "market_price": 155.99,
        "category": "الکترونیک",
        "subcategory": "صوتی و تصویری",
        "shipping_cost": 0,
        "options": [
            {"option1_value": "مشکی", "stock": 50},
            {"option1_value": "سفید", "stock": 30},
            {"option1_value": "آبی", "stock": 20}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/3394665/pexels-photo-3394665.jpeg", "is_main": False},
            {"image_url": "https://images.pexels.com/photos/3394654/pexels-photo-3394654.jpeg", "is_main": False}
        ]
    },
    {
        "name": "ردیاب هوشمند تناسب اندام",
        "description": "گام‌ها، ضربان قلب، خواب و موارد دیگر را با این ردیاب پیشرفته تناسب اندام پیگیری کنید. ضد آب و با عمر باتری طولانی.",
        "base_price": 89.99,
        "market_price": 107.99,
        "category": "الکترونیک",
        "subcategory": "گجت‌های هوشمند",
        "shipping_cost": 0,
        "options": [
            {"option1_value": "کوچک", "option2_value": "مشکی", "stock": 25},
            {"option1_value": "متوسط", "option2_value": "مشکی", "stock": 40},
            {"option1_value": "بزرگ", "option2_value": "مشکی", "stock": 30},
            {"option1_value": "کوچک", "option2_value": "صورتی", "stock": 20},
            {"option1_value": "متوسط", "option2_value": "صورتی", "stock": 35},
            {"option1_value": "بزرگ", "option2_value": "صورتی", "stock": 25}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/4482900/pexels-photo-4482900.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/4397840/pexels-photo-4397840.jpeg", "is_main": False}
        ]
    },
    {
        "name": "تی‌شرت مردانه راحتی",
        "description": "تی‌شرت نخی ۱۰۰٪ راحت برای استفاده روزمره. در رنگ‌ها و سایزهای مختلف موجود است.",
        "base_price": 24.99,
        "market_price": 29.99,
        "category": "پوشاک",
        "subcategory": "لباس مردانه",
        "option1_name": "سایز",
        "option2_name": "رنگ",
        "shipping_cost": 4.99,
        "options": [
            {"option1_value": "کوچک", "option2_value": "مشکی", "stock": 50},
            {"option1_value": "متوسط", "option2_value": "مشکی", "stock": 60},
            {"option1_value": "بزرگ", "option2_value": "مشکی", "stock": 40},
            {"option1_value": "کوچک", "option2_value": "سفید", "stock": 45},
            {"option1_value": "متوسط", "option2_value": "سفید", "stock": 55},
            {"option1_value": "بزرگ", "option2_value": "سفید", "stock": 35},
            {"option1_value": "کوچک", "option2_value": "آبی", "stock": 40},
            {"option1_value": "متوسط", "option2_value": "آبی", "stock": 50},
            {"option1_value": "بزرگ", "option2_value": "آبی", "stock": 30}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/991509/pexels-photo-991509.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg", "is_main": False},
            {"image_url": "https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg", "is_main": False}
        ]
    },
    {
        "name": "ست پخت و پز نچسب",
        "description": "ست پخت و پز نچسب ۱۰ تکه شامل قابلمه، ماهیتابه و وسایل آشپزخانه. مناسب برای هر آشپزخانه‌ای.",
        "base_price": 149.99,
        "market_price": 179.99,
        "category": "خانه و آشپزخانه",
        "subcategory": "لوازم آشپزخانه",
        "shipping_cost": 9.99,
        "options": [
            {"option1_value": "مشکی", "stock": 20},
            {"option1_value": "قرمز", "stock": 15}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/5677792/pexels-photo-5677792.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/5677823/pexels-photo-5677823.jpeg", "is_main": False},
            {"image_url": "https://images.pexels.com/photos/5677794/pexels-photo-5677794.jpeg", "is_main": False}
        ]
    },
    {
        "name": "مرطوب کننده صورت ارگانیک",
        "description": "مرطوب کننده صورت طبیعی و ارگانیک مناسب برای انواع پوست. پوست شما را آبرسانی و تغذیه می‌کند.",
        "base_price": 34.99,
        "market_price": 41.99,
        "category": "زیبایی و مراقبت شخصی",
        "subcategory": "مراقبت پوست",
        "shipping_cost": 3.99,
        "options": [
            {"option1_value": "معمولی", "stock": 40},
            {"option1_value": "حساس", "stock": 35},
            {"option1_value": "خشک", "stock": 30}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/3785147/pexels-photo-3785147.jpeg", "is_main": True}
        ]
    },
    {
        "name": "مت یوگا با بند حمل",
        "description": "مت یوگای سازگار با محیط زیست، غیر لغزنده با علامت‌های تراز و بند حمل. مناسب برای علاقه‌مندان به یوگا در تمام سطوح.",
        "base_price": 45.99,
        "market_price": 54.99,
        "category": "ورزش و فضای باز",
        "subcategory": "لوازم ورزشی",
        "shipping_cost": 5.99,
        "options": [
            {"option1_value": "بنفش", "stock": 25},
            {"option1_value": "آبی", "stock": 30},
            {"option1_value": "سبز", "stock": 20}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/4056529/pexels-photo-4056529.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/3822185/pexels-photo-3822185.jpeg", "is_main": False}
        ]
    },
    {
        "name": "ست بلوک‌های ساختنی",
        "description": "ست بلوک‌های ساختنی خلاقانه برای کودکان ۳-۱۰ سال. خلاقیت و مهارت‌های حرکتی را توسعه می‌دهد.",
        "base_price": 29.99,
        "market_price": 35.99,
        "category": "اسباب بازی و بازی",
        "subcategory": "اسباب بازی",
        "shipping_cost": 4.99,
        "options": [
            {"option1_value": "۱۰۰ قطعه", "stock": 50},
            {"option1_value": "۲۵۰ قطعه", "price_adjustment": 10.0, "stock": 40}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/3933027/pexels-photo-3933027.jpeg", "is_main": True}
        ]
    },
    {
        "name": "رمان پرفروش",
        "description": "جدیدترین رمان پرفروش که خوانندگان سراسر جهان را مجذوب کرده است. در نسخه‌های جلد سخت و جلد نرم موجود است.",
        "base_price": 19.99,
        "market_price": 23.99,
        "category": "کتاب",
        "subcategory": "کتاب ادبیات",
        "shipping_cost": 3.99,
        "options": [
            {"option1_value": "جلد سخت", "price_adjustment": 5.0, "stock": 30},
            {"option1_value": "جلد نرم", "stock": 50},
            {"option1_value": "کتاب الکترونیکی", "price_adjustment": -5.0, "stock": 1000}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/1907785/pexels-photo-1907785.jpeg", "is_main": True}
        ]
    },
    {
        "name": "مولتی ویتامین ممتاز",
        "description": "مولتی ویتامین روزانه کامل با مواد مغذی ضروری برای سلامت بهینه. ۶۰ کپسول.",
        "base_price": 39.99,
        "market_price": 47.99,
        "category": "سلامت و تندرستی",
        "subcategory": "مکمل‌های غذایی",
        "shipping_cost": 0,
        "options": [
            {"option1_value": "۶۰ کپسول", "stock": 100},
            {"option1_value": "۱۲۰ کپسول", "price_adjustment": 20.0, "stock": 75}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/4210611/pexels-photo-4210611.jpeg", "is_main": True}
        ]
    },
    {
        "name": "تلویزیون هوشمند LED - ۵۰ اینچ",
        "description": "تلویزیون هوشمند LED ۵۰ اینچی با وضوح ۴K، برنامه‌های پخش داخلی و کنترل صوتی. مناسب برای هر اتاق نشیمنی.",
        "base_price": 499.99,
        "market_price": 599.99,
        "category": "الکترونیک",
        "subcategory": "صوتی و تصویری",
        "shipping_cost": 19.99,
        "options": [
            {"option1_value": "۵۰ اینچ", "stock": 15},
            {"option1_value": "۵۵ اینچ", "price_adjustment": 100.0, "stock": 10},
            {"option1_value": "۶۵ اینچ", "price_adjustment": 300.0, "stock": 5}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/5552789/pexels-photo-5552789.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/3938465/pexels-photo-3938465.jpeg", "is_main": False}
        ]
    },
    {
        "name": "دوربین دیجیتال حرفه‌ای",
        "description": "دوربین دیجیتال با کیفیت ۲۴ مگاپیکسل، زوم اپتیکال ۱۰X و قابلیت فیلمبرداری با کیفیت ۴K. مناسب برای عکاسان حرفه‌ای و آماتور.",
        "base_price": 599.99,
        "market_price": 719.99,
        "category": "الکترونیک",
        "subcategory": "گجت‌های هوشمند",
        "shipping_cost": 0,
        "options": [
            {"option1_value": "مشکی", "stock": 20},
            {"option1_value": "نقره‌ای", "stock": 15}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/1203803/pexels-photo-1203803.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg", "is_main": False}
        ]
    },
    {
        "name": "کفش ورزشی زنانه",
        "description": "کفش ورزشی با طراحی ارگونومیک و راحت. مناسب برای پیاده‌روی و ورزش‌های روزانه. سبک و با دوام.",
        "base_price": 79.99,
        "market_price": 95.99,
        "category": "پوشاک",
        "subcategory": "کفش و کیف",
        "shipping_cost": 0,
        "option1_name": "سایز",
        "option2_name": "رنگ",
        "options": [
            {"option1_value": "۳۷", "option2_value": "صورتی", "stock": 25},
            {"option1_value": "۳۸", "option2_value": "صورتی", "stock": 30},
            {"option1_value": "۳۹", "option2_value": "صورتی", "stock": 20},
            {"option1_value": "۳۷", "option2_value": "آبی", "stock": 22},
            {"option1_value": "۳۸", "option2_value": "آبی", "stock": 25},
            {"option1_value": "۳۹", "option2_value": "آبی", "stock": 18}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/1456705/pexels-photo-1456705.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg", "is_main": False}
        ]
    },
    {
        "name": "قهوه‌ساز برقی",
        "description": "قهوه‌ساز اتوماتیک با ظرفیت ۱۲ فنجان. دارای تایمر برنامه‌ریزی و سیستم گرم نگهدارنده. بدنه استیل ضدزنگ.",
        "base_price": 69.99,
        "market_price": 83.99,
        "category": "خانه و آشپزخانه",
        "subcategory": "لوازم خانگی برقی",
        "shipping_cost": 7.99,
        "options": [
            {"option1_value": "مشکی", "stock": 35},
            {"option1_value": "نقره‌ای", "stock": 25}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/6941033/pexels-photo-6941033.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/7525167/pexels-photo-7525167.jpeg", "is_main": False}
        ]
    },
    {
        "name": "ماسک صورت ضد چروک",
        "description": "ماسک صورت با عصاره طبیعی آلوئه‌ورا و کلاژن. ضدچروک و آبرسان. مناسب برای پوست‌های خشک و حساس.",
        "base_price": 24.99,
        "market_price": 29.99,
        "category": "زیبایی و مراقبت شخصی",
        "subcategory": "مراقبت پوست",
        "shipping_cost": 0,
        "options": [
            {"option1_value": "یک بسته", "stock": 100},
            {"option1_value": "بسته ۳ تایی", "price_adjustment": 25.0, "stock": 50}
        ],
        "images": [
            {"image_url": "https://images.pexels.com/photos/3762874/pexels-photo-3762874.jpeg", "is_main": True},
            {"image_url": "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg", "is_main": False}
        ]
    }
]

store_names = [
    "تک‌هاب", 
    "مد پیشرو", 
    "ضروریات خانه", 
    "نقطه زیبایی", 
    "زندگی فعال"
]

def create_test_user(db: Session):
    """Create test users: merchant and customer"""
    # Create merchant user
    merchant = User(
        first_name="Test",
        last_name="Merchant",
        email="merchant1@example.com",
        phone_number="+12345678901",
        password="password123",  # In a real application, this would be hashed
        user_type=UserType.MERCHANT,
        is_phone_verified=True
    )
    db.add(merchant)
    
    # Create customer user
    customer = User(
        first_name="علی",
        last_name="محمدی",
        email="customer1@example.com",
        phone_number="+98912000000",
        password="password123",  # In a real application, this would be hashed
        user_type=UserType.CUSTOMER,
        is_phone_verified=True
    )
    db.add(customer)
    
    db.commit()
    db.refresh(merchant)
    db.refresh(customer)
    return merchant, customer

def create_categories(db: Session):
    """Create product categories"""
    category_objs = {}
    
    # Placeholder category images - in a real app, you'd have proper category images
    category_images = {
        "الکترونیک": "https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg",
        "پوشاک": "https://images.pexels.com/photos/934063/pexels-photo-934063.jpeg",
        "خانه و آشپزخانه": "https://images.pexels.com/photos/6207813/pexels-photo-6207813.jpeg",
        "زیبایی و مراقبت شخصی": "https://images.pexels.com/photos/3373739/pexels-photo-3373739.jpeg",
        "ورزش و فضای باز": "https://images.pexels.com/photos/6456305/pexels-photo-6456305.jpeg",
        "اسباب بازی و بازی": "https://images.pexels.com/photos/163696/toy-car-toy-box-mini-163696.jpeg",
        "کتاب": "https://images.pexels.com/photos/590493/pexels-photo-590493.jpeg",
        "سلامت و تندرستی": "https://images.pexels.com/photos/3759660/pexels-photo-3759660.jpeg"
    }
    
    for category_name in categories:
        slug = slugify(category_name)
        image_url = category_images.get(category_name)
        
        category = Category(
            name=category_name,
            slug=slug,
            image_url=image_url
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        category_objs[category_name] = category
    return category_objs

def create_subcategories(db: Session, category_map):
    """Create subcategories for each category"""
    subcategory_objs = {}
    
    # Placeholder subcategory images
    subcategory_images = {
        # Electronics subcategories
        ("الکترونیک", "گوشی و لوازم جانبی"): "https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg",
        ("الکترونیک", "لپ تاپ و کامپیوتر"): "https://images.pexels.com/photos/18105/pexels-photo.jpg",
        ("الکترونیک", "صوتی و تصویری"): "https://images.pexels.com/photos/1649669/pexels-photo-1649669.jpeg",
        ("الکترونیک", "گجت‌های هوشمند"): "https://images.pexels.com/photos/267394/pexels-photo-267394.jpeg",
        # Add more mappings for other subcategories as needed
    }
    
    for category_name, subcat_list in subcategories.items():
        category = category_map[category_name]
        for subcategory_name in subcat_list:
            slug = slugify(subcategory_name)
            image_url = subcategory_images.get((category_name, subcategory_name))
            
            subcategory = SubCategory(
                name=subcategory_name,
                slug=slug,
                image_url=image_url,
                category_id=category.id
            )
            db.add(subcategory)
            db.commit()
            db.refresh(subcategory)
            # Use a tuple of category and subcategory names as the key
            subcategory_objs[(category_name, subcategory_name)] = subcategory
    return subcategory_objs

def create_stores(db: Session, user_id):
    """Create stores"""
    store_objs = {}
    for store_name in store_names:
        store = Store(
            name=store_name,
            description=f"{store_name} - A great place to shop!",
            merchant_id=user_id
        )
        db.add(store)
        db.commit()
        db.refresh(store)
        store_objs[store_name] = store
    return store_objs

def create_products(db: Session, category_map, subcategory_map, store_map):
    """Create products with options and images"""
    for product in product_data:
        # Assign to a random store
        store = random.choice(list(store_map.values()))
        
        # Get category and subcategory
        category = category_map[product["category"]]
        subcategory = subcategory_map.get((product["category"], product.get("subcategory")))
        
        # Create the product
        new_product = Product(
            name=product["name"],
            description=product["description"],
            base_price=product["base_price"],
            market_price=product["market_price"],
            store_id=store.id,
            category_id=category.id,
            subcategory_id=subcategory.id if subcategory else None,
            option1_name=product.get("option1_name"),
            option2_name=product.get("option2_name"),
            shipping_cost=product.get("shipping_cost", 0)
        )
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        
        # Add options
        for option_data in product["options"]:
            option = ProductOption(
                product_id=new_product.id,
                option1_value=option_data.get("option1_value"),
                option2_value=option_data.get("option2_value"),
                stock=option_data.get("stock", 0),
                price_adjustment=option_data.get("price_adjustment", 0)
            )
            db.add(option)
        
        # Add images
        for image_data in product["images"]:
            image = ProductImage(
                product_id=new_product.id,
                image_url=image_data["image_url"],
                is_main=image_data.get("is_main", False)
            )
            db.add(image)
        
        db.commit()
        print(f"Created product: {new_product.name}")

def create_user_addresses(db: Session, user_id: int):
    """Create sample addresses for the user"""
    
    addresses = [
        {
            "title": "منزل",
            "full_address": "تهران، خیابان ولیعصر، کوچه شهید مجتبی، پلاک ۲۳، واحد ۵",
            "postal_code": "1234567890",
            "receiver_name": "علی محمدی",
            "phone_number": "09121234567",
            "latitude": 35.7219,
            "longitude": 51.3347,
            "is_default": True
        },
        {
            "title": "محل کار",
            "full_address": "تهران، خیابان شریعتی، خیابان ملک، پلاک ۱۲۵، طبقه دوم",
            "postal_code": "9876543210",
            "receiver_name": "علی محمدی",
            "phone_number": "09121234567",
            "latitude": 35.7545,
            "longitude": 51.4100,
            "is_default": False
        },
        {
            "title": "خانه پدری",
            "full_address": "اصفهان، خیابان چهارباغ، کوچه گلستان، پلاک ۳۲",
            "postal_code": "5432167890",
            "receiver_name": "رضا محمدی",
            "phone_number": "09131234567",
            "latitude": 32.6539,
            "longitude": 51.6660,
            "is_default": False
        }
    ]
    
    for address_data in addresses:
        address = UserAddress(
            user_id=user_id,
            title=address_data["title"],
            full_address=address_data["full_address"],
            postal_code=address_data["postal_code"],
            receiver_name=address_data["receiver_name"],
            phone_number=address_data["phone_number"],
            latitude=address_data["latitude"],
            longitude=address_data["longitude"],
            is_default=address_data["is_default"]
        )
        db.add(address)
    
    db.commit()
    print(f"Created {len(addresses)} addresses for user ID {user_id}")
    return len(addresses)

def main():
    """Main function to seed the database"""
    print("Starting database seeding...")
    
    # Reset the database first
    reset_database()
    print("Database reset completed.")
    
    db = SessionLocal()
    try:
        # Create test users
        merchant, customer = create_test_user(db)
        print(f"Created merchant user: {merchant.first_name} {merchant.last_name}")
        print(f"Created customer user: {customer.first_name} {customer.last_name}")
        
        # Create user addresses for the customer
        num_addresses = create_user_addresses(db, customer.id)
        print(f"Created {num_addresses} addresses for customer {customer.first_name} {customer.last_name}")
        
        # Create categories
        category_map = create_categories(db)
        print(f"Created {len(category_map)} categories")
        
        # Create subcategories
        subcategory_map = create_subcategories(db, category_map)
        print(f"Created {len(subcategory_map)} subcategories")
        
        # Create stores
        store_map = create_stores(db, merchant.id)
        print(f"Created {len(store_map)} stores")
        
        # Create products
        create_products(db, category_map, subcategory_map, store_map)
        print("Database seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main() 
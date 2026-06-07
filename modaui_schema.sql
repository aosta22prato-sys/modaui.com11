-- MODAUI All-in-One Business Database Schema (MySQL/PostgreSQL Compatible)
-- Generated for Local SQL Migration

-- 1. Tenants (Companies) Table
CREATE TABLE tenants (
    id VARCHAR(50) PRIMARY KEY,
    merchant_name VARCHAR(100) NOT NULL,
    company_slogan TEXT,
    industry_id VARCHAR(30) NOT NULL, -- fashion, catering, retail, etc.
    billing_tier VARCHAR(20) DEFAULT 'trial', -- trial, standard, professional, enterprise
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, maintenance, locked
    is_store_online BOOLEAN DEFAULT TRUE,
    owner_id VARCHAR(50), -- Link to users table
    token_balance BIGINT DEFAULT 1500000,
    spend_amount DECIMAL(15, 2) DEFAULT 0.00,
    recharge_total DECIMAL(15, 2) DEFAULT 0.00,
    agent_limit INT DEFAULT 6,
    storage_limit VARCHAR(20) DEFAULT '10GB',
    gemini_quota BIGINT DEFAULT 1500000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Users & RBAC Table
CREATE TABLE users (
    uid VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'founder', -- founder, admin, manager, staff, customer
    tenant_id VARCHAR(50), -- Current active tenant context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 3. Products (SPU/SKU) Table
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    industry_id VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    stock INT DEFAULT 0,
    image_url TEXT,
    category VARCHAR(50),
    description TEXT,
    sales_count INT DEFAULT 0,
    rating VARCHAR(10) DEFAULT '100%',
    specs_json JSON, -- Dynamic specifications (sizes, colors, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 4. Orders Table
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    industry_id VARCHAR(30) NOT NULL,
    customer_name VARCHAR(100),
    phone VARCHAR(20),
    total_price DECIMAL(15, 2) NOT NULL,
    order_desc TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, dispatched, completed, cancelled
    order_type VARCHAR(20), -- takeout, dine_in, shipping
    location_info TEXT,
    tracking_no VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 5. Audit & System Logs Table
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(50),
    user_email VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    module_name VARCHAR(50),
    client_ip VARCHAR(50),
    payload_json JSON, -- Extra metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Billing & Invoices Table
CREATE TABLE billing_invoices (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL,
    tokens_credited BIGINT DEFAULT 0,
    payment_method VARCHAR(20), -- stripe, alipay, wechat
    status VARCHAR(20) DEFAULT 'paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 7. AI Knowledge Base & Memory Table
CREATE TABLE ai_knowledge (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    industry_id VARCHAR(30) NOT NULL,
    chunk_content TEXT NOT NULL,
    vector_id VARCHAR(100), -- ID in Qdrant/Pinecone
    source_type VARCHAR(50), -- pdf, text, website
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 8. Industry Coupons & Marketing Table
CREATE TABLE coupons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    discount_amount DECIMAL(15, 2),
    min_spend DECIMAL(15, 2),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expired_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

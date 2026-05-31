const request = require('supertest');
const app = require('../src/app');
const { getAuthCookie } = require('../setup/auth');
const orderModel = require('../src/models/order.model');
const mongoose = require('mongoose');

describe('PATCH /api/orders/:id/address — Update delivery address prior to payment capture', () => {
    const orderId = new mongoose.Types.ObjectId().toString();
    const mockUserId = '6a1beba1ac32899c7d7c6544';

    const validAddress = {
        addressLine1: '456 Second St',
        addressLine2: 'Apt 4B',
        city: 'Gotham',
        state: 'NY',
        pincode: '10001',
        country: 'USA',
        addressType: 'home'
    };

    // Shared schema-compliant base structure to seed into MongoDB securely
    const baseOrderData = {
        items: [],
        status: 'PENDING',
        totalAmount: { amount: 0, currency: 'USD' }, // Matches totalAmount requirement
        shippingAddress: {
            addressLine1: '123 Main St',
            city: 'Metropolis',
            state: 'NY',
            pincode: '10001',
            country: 'USA'
        }
    };

    afterEach(async () => {
        await orderModel.deleteOne({ _id: orderId });
    });

    // ==========================================
    // SUCCESS PATHS
    // ==========================================
    it('should update shipping address and return updated order with 201 status', async () => {
        await orderModel.create({
            _id: orderId,
            userId: mockUserId,
            ...baseOrderData
        });

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie({ id: mockUserId })) 
            .send({ shippingAddress: validAddress })
            .expect('Content-Type', /json/)
            .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.order.shippingAddress).toMatchObject(validAddress);
    });

    // ==========================================
    // CONTROLLER & ROUTER LOGIC PATHS
    // ==========================================
    it('should return 404 when the order ID is structurally an invalid Mongo ObjectId string', async () => {
        const res = await request(app)
            .patch('/api/orders/not-a-valid-id/address')
            .set('Cookie', getAuthCookie({ id: mockUserId }))
            .send({ shippingAddress: validAddress })
            .expect('Content-Type', /json/)
            .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Invalid Order Id');
    });

    it('should return 404 when the order does not exist in the database', async () => {
        const structuralValidMissingId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .patch(`/api/orders/${structuralValidMissingId}/address`)
            .set('Cookie', getAuthCookie({ id: mockUserId }))
            .send({ shippingAddress: validAddress })
            .expect('Content-Type', /json/)
            .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Order not found');
    });

    it('should return 403 when a user tries to alter an order belonging to someone else', async () => {
        await orderModel.create({
            _id: orderId,
            userId: '6a1beba1ac32899c7d7c6999', // Owned by a different user
            ...baseOrderData
        });

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie({ id: mockUserId }))
            .send({ shippingAddress: validAddress })
            .expect('Content-Type', /json/)
            .expect(403);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Forbidden');
    });

    it('should return 409 when the order status is already SHIPPED or PAID', async () => {
        await orderModel.create({
            _id: orderId,
            userId: mockUserId,
            ...baseOrderData,
            status: 'SHIPPED' // Breaks PENDING state constraint safely
        });

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie({ id: mockUserId }))
            .send({ shippingAddress: validAddress })
            .expect('Content-Type', /json/)
            .expect(409);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Order address cannot be cancelled at this stage');
    });

    // ==========================================
    // EXPRESS-VALIDATOR SCHEMA PATHS
    // ==========================================
    it('should return 400 when core required fields are entirely missing', async () => {
        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie({ id: mockUserId }))
            .send({ shippingAddress: {} })
            .expect('Content-Type', /json/)
            .expect(400);

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 when strings violate structural character regex requirements', async () => {
        const invalidCharAddress = {
            ...validAddress,
            city: 'GothamCity@#$', 
            state: 'NY123!'
        };

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie({ id: mockUserId }))
            .send({ shippingAddress: invalidCharAddress })
            .expect(400);

        const errorPaths = res.body.errors.map(err => err.path);
        expect(errorPaths).toContain('shippingAddress.city');
        expect(errorPaths).toContain('shippingAddress.state');
    });

    it('should return 400 when pincode does not conform to a 5 or 6 digit layout string', async () => {
        const invalidPincodeAddress = {
            ...validAddress,
            pincode: 'abc'
        };

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie({ id: mockUserId }))
            .send({ shippingAddress: invalidPincodeAddress })
            .expect(400);

        expect(res.body.errors[0].path).toBe('shippingAddress.pincode');
    });

    it('should return 400 when optional addressType parameter falls outside enum parameters', async () => {
        const invalidTypeAddress = {
            ...validAddress,
            addressType: 'mansion'
        };

        const res = await request(app)
            .patch(`/api/orders/${orderId}/address`)
            .set('Cookie', getAuthCookie({ id: mockUserId }))
            .send({ shippingAddress: invalidTypeAddress })
            .expect(400);

        expect(res.body.errors[0].path).toBe('shippingAddress.addressType');
    });
});
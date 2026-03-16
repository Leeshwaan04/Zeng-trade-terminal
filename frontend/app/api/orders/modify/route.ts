import { NextResponse } from 'next/server';
import { modifyOrder } from '@/lib/kite-client';
import { cookies } from 'next/headers';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { order_id, price, quantity, trigger_price, order_type } = body;

        if (!order_id) {
            return NextResponse.json({ status: 'error', message: 'Order ID is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const kitePayload = cookieStore.get('kite_auth_payload');

        if (!kitePayload) {
            return NextResponse.json({ status: 'error', message: 'Authentication required' }, { status: 401 });
        }

        const { access_token } = JSON.parse(kitePayload.value);
        const apiKey = process.env.KITE_API_KEY!;

        const result = await modifyOrder(apiKey, access_token, order_id, {
            price,
            quantity,
            trigger_price,
            order_type,
            validity: 'DAY'
        });

        return NextResponse.json({
            status: 'success',
            data: result
        });
    } catch (error: any) {
        console.error('Kite Modify Order Error:', error);
        return NextResponse.json({
            status: 'error',
            message: error.message || 'Failed to modify order'
        }, { status: 500 });
    }
}

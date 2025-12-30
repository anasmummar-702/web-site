import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('DB_URL') ?? '',
      Deno.env.get('DB_ADMIN_KEY') ?? ''
    )

    const razorpaySecret = Deno.env.get('RZP_SECRET') ?? ''
    const webhookSignature = req.headers.get('x-razorpay-signature')

    if (webhookSignature) {
        const bodyText = await req.text()
        const encoder = new TextEncoder()
        const keyData = encoder.encode(razorpaySecret)
        const msgData = encoder.encode(bodyText)
        const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
        const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
        const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')

        if (hexSignature !== webhookSignature) {
            return new Response(JSON.stringify({ error: "Invalid Webhook Signature" }), { status: 400 })
        }

        const payload = JSON.parse(bodyText)
        if (payload.event === 'order.paid') {
            const rzpOrder = payload.payload.order.entity
            const paymentId = payload.payload.payment.entity.id
            
            const { data: dbOrder } = await supabase
                .from('orders')
                .select('id')
                .eq('razorpay_order_id', rzpOrder.id)
                .single()

            if (dbOrder) {
                await supabase.rpc('confirm_order', {
                    p_order_id: dbOrder.id,
                    p_payment_id: paymentId,
                    p_signature: 'webhook_verified'
                })
            }
        }
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
    }

    const { action, cartItems, customerInfo, paymentData } = await req.json()

    if (action === 'create_order') {
      if (!Array.isArray(cartItems) || cartItems.length === 0) throw new Error('Invalid cart')

      let totalAmount = 0
      
      for (const item of cartItems) {
        if (!Number.isInteger(item.qty) || item.qty <= 0) throw new Error(`Invalid quantity`)

        const { data: product } = await supabase
          .from('products')
          .select('price, variants, stock_quantity')
          .eq('id', item.id)
          .single()
        
        if (!product) throw new Error(`Product not found`)

        let price = Number(product.price)
        let stock = Number(product.stock_quantity) 

        if (Array.isArray(product.variants)) {
            const v = product.variants.find((v: any) => v.name === item.variant)
            if (v) {
                const s = v.sizes.find((s: any) => s.size === item.size)
                if (s) {
                    price = Number(s.price)
                    stock = Number(s.stock)
                }
            }
        } else if (product.variants && product.variants.options) {
             const s = product.variants.options.find((o:any) => o.size === item.size)
             if(s) {
                 price = Number(s.price)
                 stock = Number(s.stock)
             }
        }

        if (stock < item.qty) throw new Error(`Insufficient stock available`)
        totalAmount += price * item.qty
      }

      let rzpOrderId = null
      let status = 'Pending Payment'

      if (customerInfo.payment_method === 'COD') {
          status = 'Pending'
      } else {
          const rzpBody = {
            amount: totalAmount * 100,
            currency: "INR",
            receipt: `rc_order_${Date.now()}`,
            payment_capture: 1
          }

          const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${Deno.env.get('RZP_ID')}:${razorpaySecret}`),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(rzpBody)
          })

          if(!rzpRes.ok) throw new Error("Payment Gateway Error")
          const rzpOrder = await rzpRes.json()
          rzpOrderId = rzpOrder.id
      }

      const { data: dbOrder, error: dbErr } = await supabase
        .from('orders')
        .insert({
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          address: customerInfo.address,
          post_code: customerInfo.postcode,
          total_amount: totalAmount,
          payment_method: customerInfo.payment_method,
          razorpay_order_id: rzpOrderId,
          status: status,
          cart_snapshot: cartItems
        })
        .select()
        .single()

      if (dbErr) throw dbErr

      if (customerInfo.payment_method === 'COD') {
          const { data: confirmResult } = await supabase.rpc('confirm_order', {
              p_order_id: dbOrder.id,
              p_payment_id: 'COD',
              p_signature: 'COD'
          })
          
          if (!confirmResult.success) {
               await supabase.from('orders').delete().eq('id', dbOrder.id)
               throw new Error(confirmResult.error || 'Stock verification failed')
          }
      }

      return new Response(JSON.stringify({ 
        rzpOrderId: rzpOrderId, 
        amount: totalAmount * 100,
        dbOrderId: dbOrder.id,
        key: Deno.env.get('RZP_ID')
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'verify_payment') {
        const { rzpOrderId, rzpPaymentId, rzpSignature, dbOrderId } = paymentData
        
        const text = rzpOrderId + "|" + rzpPaymentId
        const encoder = new TextEncoder()
        const keyData = encoder.encode(razorpaySecret)
        const msgData = encoder.encode(text)
        const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
        const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
        const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
        
        if (hexSignature !== rzpSignature) throw new Error("Invalid Payment Signature")

        const { data: result, error: rpcError } = await supabase.rpc('confirm_order', {
            p_order_id: dbOrderId,
            p_payment_id: rzpPaymentId,
            p_signature: rzpSignature
        })

        if (rpcError || !result.success) {
            if (result && result.message === 'Already processed') {
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
            }
            throw new Error(result?.error || rpcError?.message || "Order processing failed")
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }

    return new Response(JSON.stringify({ error: 'Invalid Action' }), { status: 400 })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
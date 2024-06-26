<?php

namespace App\Http\Controllers;

// Custom Imports
use App\Http\Validators\StripeValidator;

use App\Models\Subscription as SubscriptionModel;
use Illuminate\Http\Request;
use Stripe\Stripe;
use Stripe\Subscription as StripeSubscription;
use Stripe\PaymentIntent;
use Stripe\Checkout\Session;

Stripe::setApiKey(env('STRIPE_API_KEY'));

class SubscriptionController extends Controller
{
    /**
     * Constructor method for the SubscriptionController.
     */
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Create a new Checkout Session.
     *
     * @param Request $request The request containing the necessary data.
     * @throws \Exception Handle any errors that occur.
     * @return mixed The payment URL to the client or an error message.
     */
    public function createCheckoutSession(Request $request)
    {
        try {
            // Create a new Checkout Session
            $session = Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [
                    [
                        'price' => $request->price_id,
                        'quantity' => 1,
                    ],
                ],
                'mode' => 'payment',
                'success_url' => env('STRIPE_SUCCESS_URL'),
                'cancel_url' => env('STRIPE_CANCEL_URL'),
            ]);

            // Return the payment URL to the client
            return $session;
        } catch (\Exception $e) {
            // Handle any errors that occur
            return $e->getMessage();
        }
    }

    /**
     * Create a new subscription.
     *
     * @param Request $request The HTTP request object containing the necessary data.
     * @param int $id The ID of the customer.
     * @return \Illuminate\Http\JsonResponse The JSON response with the subscription details or an error message.
     */
    public function createSubscription(Request $request, $id)
    {
        $validator = StripeValidator::validateCreateSubscription($request);
    
        if ($validator->fails()) {
            $errors = $validator->errors();
            return response()->json([
                'status' => 'error',
                'message' => $errors->all(),
            ], 400);
        }

        try {
            // Create the subscription
            $subscription = StripeSubscription::create([
                'customer' => $request->customer_id,
                'items' => [
                    ['price' => $request->price_id],
                ],
            ]);

            // Return the subscription ID
            return response()->json([
                'status' => 'success',
                'message' => 'Subscription created successfully',
                'data' => $subscription,
            ]);
        } catch (\Exception $e) {
            // Handle any errors that occur
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create subscription',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new one-time payment.
     *
     * @param Request $request The HTTP request object containing the necessary data.
     *                       - amount: The amount of the payment in the smallest currency unit.
     *                       - currency: The currency of the payment.
     *                       - payment_method: The payment method to be used.
     *                       - customer: The ID of the customer making the payment.
     * @throws \Exception If an error occurs while creating the payment intent.
     * @return \Illuminate\Http\JsonResponse The JSON response with the status of the payment creation and the client secret.
     */
    function createOneTimePayment(Request $request)
    {
        try {
            // Create a payment intent
            $paymentIntent = PaymentIntent::create([
                'amount' => $request->amount,
                'currency' => $request->currency,
                'payment_method' => $request->payment_method,
                'customer' => $request->customer,
                'confirmation_method' => 'manual',
            ]);
 
            // Return the client secret
            return response()->json([
                'status' => 'success',
                'client_secret' => [
                    ['intent' => $paymentIntent],
                    // ['url' =>  $paymentUrl],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create payment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retrieve the payment status based on the provided payment intent ID.
     *
     * @param datatype $paymentIntentId The ID of the payment intent to check.
     * @throws \Exception If an error occurs while retrieving the payment status.
     * @return Illuminate\Http\JsonResponse The JSON response with the payment status.
     */
    function checkPaymentStatus($paymentIntentId)
    {
        try {
            // Retrieve the payment intent
            $paymentIntent = PaymentIntent::retrieve($paymentIntentId);

            // Return the payment status
            return response()->json([
                'status' => 'success',
                'payment_status' => $paymentIntent->status,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve payment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retrieves a subscription from Stripe by its ID and returns the subscription data as a JSON response.
     *
     * @param int $id The ID of the subscription to retrieve.
     * @throws \Exception If an error occurs while retrieving the subscription.
     * @return \Illuminate\Http\JsonResponse The subscription data as a JSON response.
     */
    public function getSubscription($id)
    {
        // Set your Stripe API secret key

        try {
            // Retrieve the subscription from Stripe
            $subscription = StripeSubscription::retrieve($id);

            // Return the subscription data as JSON response
            return response()->json($subscription);
        } catch (\Exception $e) {
            // Handle any errors and return an error response
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate a payment link for a product and price ID.
     *
     * @param datatype $product_id description
     * @param datatype $price_id description
     * @throws \Exception Handle any errors that occur.
     * @return \Illuminate\Http\JsonResponse The JSON response with the payment link or an error message.
     */
    public function generatePaymentLink($product_id, $price_id)
    {
        try {
            $stripe = new \Stripe\StripeClient(env('STRIPE_API_KEY'));
            // Return the payment link to the client
            $data = $stripe->paymentLinks->create([
                'line_items' => [
                  [
                    'price' => $price_id,
                    'quantity' => 1,
                  ],
                ],
              ]);
            return response()->json([
                'status' => 'success',
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            // Handle any errors that occur
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check the status of a payment link.
     *
     * @param string $paymentLinkId The ID of the payment link.
     * @throws \Exception If an error occurs while retrieving the payment link or handling the status.
     * @return \Illuminate\Http\JsonResponse The JSON response with the payment link status.
     */
    public function checkPaymentLinkStatus($paymentLinkId)
    {
        try {
            // Retrieve the payment link using the payment link ID
            $stripe = new \Stripe\StripeClient(env('STRIPE_API_KEY'));
             // Retrieve the payment link object
            $paymentLink = $stripe->paymentLinks->retrieve($paymentLinkId);
            
            // Get the status of the payment link
            $status = $paymentLink->status;
            
            return $paymentLink;
            // Check the status and handle accordingly
            if ($status === 'paid') {
                // Payment is completed
                return response()->json([
                    'status' => 'success',
                    'message' => 'Payment is completed',
                ]);
            } elseif ($status === 'pending') {
                // Payment is pending
                return response()->json([
                    'status' => 'info',
                    'message' => 'Payment is pending',
                ]);
            } elseif ($status === 'created') {
                // Payment link is created but not used for payment
                return response()->json([
                    'status' => 'info',
                    'message' => 'Payment link is created but not used',
                ]);
            } elseif ($status === 'canceled') {
                // Payment link is canceled
                return response()->json([
                    'status' => 'info',
                    'message' => 'Payment link is canceled',
                ]);
            } else {
                // Unknown status
                return response()->json([
                    'status' => 'unknown',
                    'message' => 'Unknown payment link status',
                ]);
            }
        } catch (\Exception $e) {
            // Handle any errors that occur
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
